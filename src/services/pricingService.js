import { CURRENCY, ErrorCode } from '../utils/constants'
import { ServiceError } from '../utils/errors'
import { computePrice } from '../utils/price'
import { isValidInstant, toMs } from '../utils/time'
import { clone, requireEntity } from './helpers'
import { store } from './store'

export function discountsForHub(state, hubId) {
  return state.pricingRules.filter((r) => r.hubId === hubId && r.isActive)
}

// The only place a price is calculated. Discounts default to the hub's active rules.
export async function calculatePrice({ resource, startAt, endAt, pricingRules }) {
  if (!resource || !Number.isFinite(resource.hourlyRate)) {
    throw new ServiceError(ErrorCode.INVALID_INPUT, 'A resource with an hourly rate is required.')
  }
  if (!isValidInstant(startAt) || !isValidInstant(endAt) || toMs(endAt) <= toMs(startAt)) {
    throw new ServiceError(ErrorCode.INVALID_TIME_RANGE, 'End time must be after start time.')
  }
  const discounts = pricingRules ?? discountsForHub(store.getState(), resource.hubId)
  return computePrice({ hourlyRate: resource.hourlyRate, startAt, endAt, discounts })
}

export async function getPricingForHub(hubId, branchId) {
  const state = store.getState()
  requireEntity(state.hubs, hubId, 'Hub')
  const rates = state.resources
    .filter((r) => r.hubId === hubId && r.isActive && (!branchId || r.branchId === branchId))
    .map((r) => ({
      resourceId: r.id,
      branchId: r.branchId,
      name: r.name,
      type: r.type,
      hourlyRate: r.hourlyRate,
    }))
  return clone({ currency: CURRENCY, rates, discounts: discountsForHub(state, hubId) })
}
