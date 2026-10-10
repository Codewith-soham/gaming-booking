import { now } from '../utils/clock'
import { BOOKING_RULES, ErrorCode, OperationalStatus, ResourceType } from '../utils/constants'
import { getOpeningWindow, resolveOpeningHours } from '../utils/hours'
import { blockingIntervals } from '../utils/occupancy'
import { overlaps, parseDateKey, toMs } from '../utils/time'
import { clone, invalid, requireEntity, resolveBranch, validateDuration } from './helpers'
import { store } from './store'

function slotsFor(state, resource, window, durationMinutes, nowMs) {
  const blocks = blockingIntervals(state, resource.id)
  const step = BOOKING_RULES.SLOT_INCREMENT_MINUTES * 60000
  const length = durationMinutes * 60000
  const slots = []
  for (let start = window.open.getTime(); start + length <= window.close.getTime(); start += step) {
    if (start < nowMs) continue
    const end = start + length
    if (blocks.some((b) => overlaps(start, end, b.start, b.end))) continue
    slots.push({ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() })
  }
  return slots
}

// Derived from: opening hours, operational status, non-cancelled bookings, running sessions,
// duration and date. Stale results are advisory only: bookingService revalidates on create.
export async function getAvailability({
  hubId,
  branchId,
  date,
  durationMinutes,
  resourceType,
  resourceId,
}) {
  const state = store.getState()
  const hub = requireEntity(state.hubs, hubId, 'Hub')
  const branch = resolveBranch(state, hub, branchId)
  if (!parseDateKey(date)) throw invalid('date must be formatted as YYYY-MM-DD.', { field: 'date' })
  validateDuration(durationMinutes)
  if (resourceType && !Object.values(ResourceType).includes(resourceType)) {
    throw invalid('Unknown resource type.', { field: 'resourceType' })
  }

  let candidates = state.resources.filter((r) => r.branchId === branch.id && r.isActive)
  if (resourceId) {
    const wanted = requireEntity(candidates, resourceId, 'Resource')
    candidates = [wanted]
  }
  if (resourceType) candidates = candidates.filter((r) => r.type === resourceType)

  const window = getOpeningWindow(resolveOpeningHours(hub, branch), date)
  const nowMs = toMs(now())
  const bookable = candidates.filter((r) => r.operationalStatus === OperationalStatus.AVAILABLE)
  const excluded = candidates
    .filter((r) => r.operationalStatus !== OperationalStatus.AVAILABLE)
    .map((r) => ({
      resource: r,
      code:
        r.operationalStatus === OperationalStatus.MAINTENANCE
          ? ErrorCode.RESOURCE_UNDER_MAINTENANCE
          : ErrorCode.RESOURCE_UNAVAILABLE,
    }))

  return clone({
    hubId: hub.id,
    branchId: branch.id,
    date,
    durationMinutes,
    closed: !window,
    openingWindow: window
      ? { openAt: window.open.toISOString(), closeAt: window.close.toISOString() }
      : null,
    resources: bookable.map((resource) => ({
      resource,
      slots: window ? slotsFor(state, resource, window, durationMinutes, nowMs) : [],
    })),
    excluded,
  })
}
