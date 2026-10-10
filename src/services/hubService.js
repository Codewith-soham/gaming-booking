import { ErrorCode, StationState } from '../utils/constants'
import { ServiceError } from '../utils/errors'
import { deriveStationStatus } from '../utils/stationStatus'
import { clone, requireEntity } from './helpers'
import { store } from './store'

function summarize(state, hub) {
  const resources = state.resources.filter((r) => r.hubId === hub.id && r.isActive)
  const rates = resources.map((r) => r.hourlyRate)
  return {
    branchCount: hub.branchIds.length,
    resourceCount: resources.length,
    resourceTypes: [...new Set(resources.map((r) => r.type))],
    minHourlyRate: rates.length ? Math.min(...rates) : null,
    // Derived from bookings/sessions + operational status, not a stored "live" flag.
    availableNow: resources.filter(
      (r) => deriveStationStatus(r, state.bookings, state.sessions) === StationState.AVAILABLE,
    ).length,
  }
}

function withSummary(state, hub) {
  return clone({ ...hub, summary: summarize(state, hub) })
}

// filters: { query, city, resourceType, amenity, maxHourlyRate, includeUnpublished }
export async function listHubs(filters = {}) {
  const state = store.getState()
  const q = filters.query?.trim().toLowerCase()
  return state.hubs
    .filter((h) => filters.includeUnpublished || h.isPublished)
    .filter((h) => !filters.city || h.city.toLowerCase() === filters.city.toLowerCase())
    .filter(
      (h) =>
        !q || [h.name, h.city, h.address, h.description].some((v) => v.toLowerCase().includes(q)),
    )
    .filter((h) => !filters.amenity || h.amenities.includes(filters.amenity))
    .map((h) => withSummary(state, h))
    .filter((h) => !filters.resourceType || h.summary.resourceTypes.includes(filters.resourceType))
    .filter(
      (h) =>
        filters.maxHourlyRate == null ||
        (h.summary.minHourlyRate != null && h.summary.minHourlyRate <= filters.maxHourlyRate),
    )
}

export async function getHubBySlug(slug) {
  const state = store.getState()
  const hub = state.hubs.find((h) => h.slug === slug)
  if (!hub) throw new ServiceError(ErrorCode.NOT_FOUND, 'Hub not found.', { slug })
  return withSummary(state, hub)
}

export async function getHubById(hubId) {
  const state = store.getState()
  return withSummary(state, requireEntity(state.hubs, hubId, 'Hub'))
}

export async function listBranches(hubId, { includeInactive = false } = {}) {
  const state = store.getState()
  requireEntity(state.hubs, hubId, 'Hub')
  return clone(state.branches.filter((b) => b.hubId === hubId && (includeInactive || b.isActive)))
}

export async function updateHub(hubId, changes) {
  const state = store.getState()
  requireEntity(state.hubs, hubId, 'Hub')
  const allowed = ['name', 'description', 'address', 'city', 'phone', 'amenities', 'openingHours']
  const patch = Object.fromEntries(Object.entries(changes).filter(([k]) => allowed.includes(k)))
  store.update((s) => ({
    ...s,
    hubs: s.hubs.map((h) => (h.id === hubId ? { ...h, ...patch } : h)),
  }))
  return getHubById(hubId)
}

export async function updateBranch(branchId, changes) {
  const state = store.getState()
  requireEntity(state.branches, branchId, 'Branch')
  const allowed = ['name', 'address', 'openingHours', 'isActive']
  const patch = Object.fromEntries(Object.entries(changes).filter(([k]) => allowed.includes(k)))
  store.update((s) => ({
    ...s,
    branches: s.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)),
  }))
  return clone(store.getState().branches.find((b) => b.id === branchId))
}
