import { now } from '../utils/clock'
import { BookingStatus, ErrorCode, OperationalStatus, ResourceType } from '../utils/constants'
import { ServiceError } from '../utils/errors'
import { blockingIntervals } from '../utils/occupancy'
import { deriveStationStatus } from '../utils/stationStatus'
import { toMs } from '../utils/time'
import { enrichBooking } from './bookingService'
import { clone, invalid, requireEntity, requireOneOf, requireText } from './helpers'
import { store } from './store'

const MAX_HOURLY_RATE = 100000

function requireRate(value) {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_HOURLY_RATE) {
    throw invalid(`Hourly rate must be a whole number between 1 and ${MAX_HOURLY_RATE}.`, {
      field: 'hourlyRate',
    })
  }
  return value
}

// Bookings (upcoming or running) that would be hit if the resource were taken out of service.
function upcomingCommitments(state, resourceId) {
  const t = toMs(now())
  return blockingIntervals(state, resourceId)
    .filter((i) => i.end > t)
    .map((i) => state.bookings.find((b) => b.id === i.bookingId))
    .filter((b) => b.status !== BookingStatus.COMPLETED)
}

function assertCanLeaveService(state, resource) {
  const affected = upcomingCommitments(state, resource.id)
  if (affected.length) {
    const refs = affected.map((b) => b.reference).join(', ')
    throw new ServiceError(
      ErrorCode.BOOKING_CONFLICT,
      `${resource.name} has ${affected.length} upcoming booking(s) (${refs}). Cancel or complete them first.`,
      { bookingIds: affected.map((b) => b.id), references: affected.map((b) => b.reference) },
    )
  }
}

// filters: { hubId, branchId, type, status (operational), includeInactive }
export async function listResources(filters = {}) {
  const { hubId, branchId, type, status, includeInactive = false } = filters
  return clone(
    store
      .getState()
      .resources.filter(
        (r) =>
          (!hubId || r.hubId === hubId) &&
          (!branchId || r.branchId === branchId) &&
          (!type || r.type === type) &&
          (!status || r.operationalStatus === status) &&
          (includeInactive || r.isActive),
      ),
  )
}

export async function getResourceById(resourceId) {
  return clone(requireEntity(store.getState().resources, resourceId, 'Resource'))
}

export async function listAffectedBookings(resourceId) {
  const state = store.getState()
  requireEntity(state.resources, resourceId, 'Resource')
  return clone(upcomingCommitments(state, resourceId))
}

export async function createResource(input) {
  const state = store.getState()
  const hub = requireEntity(state.hubs, input?.hubId, 'Hub')
  const branch = requireEntity(state.branches, input?.branchId, 'Branch')
  if (branch.hubId !== hub.id) throw invalid('Branch does not belong to this hub.')

  const name = requireText(input.name, 'Name')
  const type = requireOneOf(input.type, ResourceType, 'Type')
  const hourlyRate = requireRate(input.hourlyRate)
  const duplicate = state.resources.some(
    (r) => r.branchId === branch.id && r.isActive && r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw invalid(`A resource named "${name}" already exists in this branch.`)

  const seq = store.nextSeq('resource')
  const resource = {
    id: `res_${String(seq).padStart(3, '0')}`,
    hubId: hub.id,
    branchId: branch.id,
    name,
    type,
    specifications: input.specifications?.trim() ?? '',
    hourlyRate,
    operationalStatus: OperationalStatus.AVAILABLE,
    isActive: true,
  }
  store.update((s) => ({ ...s, resources: [...s.resources, resource] }))
  return clone(resource)
}

export async function updateResource(resourceId, changes = {}) {
  const state = store.getState()
  const current = requireEntity(state.resources, resourceId, 'Resource')

  const allowed = ['name', 'type', 'specifications', 'hourlyRate', 'isActive']
  const unknown = Object.keys(changes).filter((k) => !allowed.includes(k))
  if (unknown.length) throw invalid(`Cannot change: ${unknown.join(', ')}.`, { fields: unknown })

  const patch = {}
  if ('name' in changes) {
    patch.name = requireText(changes.name, 'Name')
    const duplicate = state.resources.some(
      (r) =>
        r.id !== current.id &&
        r.branchId === current.branchId &&
        r.isActive &&
        r.name.toLowerCase() === patch.name.toLowerCase(),
    )
    if (duplicate) throw invalid(`A resource named "${patch.name}" already exists in this branch.`)
  }
  if ('type' in changes) patch.type = requireOneOf(changes.type, ResourceType, 'Type')
  if ('hourlyRate' in changes) patch.hourlyRate = requireRate(changes.hourlyRate)
  if ('specifications' in changes)
    patch.specifications = String(changes.specifications ?? '').trim()
  if ('isActive' in changes) {
    if (typeof changes.isActive !== 'boolean') throw invalid('isActive must be true or false.')
    if (!changes.isActive && current.isActive) assertCanLeaveService(state, current)
    patch.isActive = changes.isActive
  }

  store.update((s) => ({
    ...s,
    resources: s.resources.map((r) => (r.id === resourceId ? { ...r, ...patch } : r)),
  }))
  return getResourceById(resourceId)
}

// Maintenance/offline is blocked while upcoming or running bookings exist (UX-FLOWS section 3,
// "block" option). Staff must cancel or complete them first.
export async function setOperationalStatus(resourceId, status) {
  const state = store.getState()
  const current = requireEntity(state.resources, resourceId, 'Resource')
  requireOneOf(status, OperationalStatus, 'Status')
  if (
    status !== OperationalStatus.AVAILABLE &&
    current.operationalStatus === OperationalStatus.AVAILABLE
  ) {
    assertCanLeaveService(state, current)
  }
  store.update((s) => ({
    ...s,
    resources: s.resources.map((r) =>
      r.id === resourceId ? { ...r, operationalStatus: status } : r,
    ),
  }))
  return getResourceById(resourceId)
}

// Resources joined with their derived live state (AVAILABLE / RESERVED / OCCUPIED / MAINTENANCE /
// OFFLINE) plus the booking in use right now and the next booking after it. The state is computed
// from bookings and sessions, never stored.
// filters: { hubId, branchId, type, includeInactive }
export async function listStationStates(filters = {}) {
  const state = store.getState()
  const at = now()
  const t = toMs(at)
  const sessionByBooking = new Map(state.sessions.map((x) => [x.bookingId, x]))

  return state.resources
    .filter(
      (r) =>
        (!filters.hubId || r.hubId === filters.hubId) &&
        (!filters.branchId || r.branchId === filters.branchId) &&
        (!filters.type || r.type === filters.type) &&
        (filters.includeInactive || r.isActive),
    )
    .map((resource) => {
      const stationState = deriveStationStatus(resource, state.bookings, state.sessions, at)
      const mine = blockingIntervals(state, resource.id)
        .filter(
          (i) =>
            state.bookings.find((b) => b.id === i.bookingId).status !== BookingStatus.COMPLETED,
        )
        .sort((a, b) => a.start - b.start)
      const current = mine.find((i) => i.start <= t && t < i.end)
      const next = mine.find((i) => i.start > t && i.bookingId !== current?.bookingId)
      const pick = (i) =>
        i
          ? enrichBooking(
              state,
              state.bookings.find((b) => b.id === i.bookingId),
            )
          : null
      return {
        ...clone(resource),
        state: stationState,
        currentBooking: pick(current),
        nextBooking: pick(next),
        hasActiveSession: [...sessionByBooking.values()].some(
          (x) =>
            x.status === 'ACTIVE' &&
            state.bookings.find((b) => b.id === x.bookingId)?.resourceId === resource.id,
        ),
      }
    })
}
