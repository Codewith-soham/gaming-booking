import { BOOKING_RULES, ErrorCode } from '../utils/constants'
import { ServiceError } from '../utils/errors'

// Services hand out copies so callers can never mutate the shared state by accident.
export function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function invalid(message, details) {
  return new ServiceError(ErrorCode.INVALID_INPUT, message, details)
}

export function requireEntity(list, id, label) {
  const found = id == null ? undefined : list.find((item) => item.id === id)
  if (!found) throw new ServiceError(ErrorCode.NOT_FOUND, `${label} not found.`, { id })
  return found
}

export function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${field} is required.`, { field })
  return value.trim()
}

export function requireOneOf(value, allowed, field) {
  if (!Object.values(allowed).includes(value)) {
    throw invalid(`${field} must be one of: ${Object.values(allowed).join(', ')}.`, { field })
  }
  return value
}

export function validateDuration(minutes) {
  const {
    MIN_DURATION_MINUTES: min,
    MAX_DURATION_MINUTES: max,
    SLOT_INCREMENT_MINUTES: step,
  } = BOOKING_RULES
  if (!Number.isInteger(minutes) || minutes < min || minutes > max || minutes % step !== 0) {
    throw new ServiceError(
      ErrorCode.INVALID_TIME_RANGE,
      `Duration must be between ${min} and ${max} minutes, in ${step}-minute steps.`,
      { minutes },
    )
  }
  return minutes
}

// A branch is required when the hub has several; a single active branch is used implicitly.
export function resolveBranch(state, hub, branchId) {
  if (branchId) {
    const branch = requireEntity(state.branches, branchId, 'Branch')
    if (branch.hubId !== hub.id) throw invalid('Branch does not belong to this hub.')
    if (!branch.isActive) throw invalid('This branch is not active.')
    return branch
  }
  const active = state.branches.filter((b) => b.hubId === hub.id && b.isActive)
  if (active.length === 1) return active[0]
  throw invalid('branchId is required for hubs with more than one branch.')
}
