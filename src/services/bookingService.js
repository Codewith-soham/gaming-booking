import { getCancellationEligibility } from '../utils/bookingRules'
import { now } from '../utils/clock'
import {
  BOOKING_RULES,
  BookingSource,
  BookingStatus,
  ErrorCode,
  OperationalStatus,
  PaymentStatus,
} from '../utils/constants'
import { ServiceError } from '../utils/errors'
import { isWithinOpeningHours, resolveOpeningHours } from '../utils/hours'
import { blockingIntervals } from '../utils/occupancy'
import { computePrice } from '../utils/price'
import {
  isValidInstant,
  minutesBetween,
  overlaps,
  plusMinutes,
  toDateKey,
  toMs,
} from '../utils/time'
import {
  clone,
  invalid,
  requireEntity,
  requireOneOf,
  resolveBranch,
  validateDuration,
} from './helpers'
import { discountsForHub } from './pricingService'
import { store } from './store'

// Bookings are returned with their related records attached so views never need to join.
export function enrichBooking(state, booking) {
  return clone({
    ...booking,
    hub: pick(
      state.hubs.find((h) => h.id === booking.hubId),
      ['id', 'name', 'slug'],
    ),
    branch: pick(
      state.branches.find((b) => b.id === booking.branchId),
      ['id', 'name'],
    ),
    customer: state.customers.find((c) => c.id === booking.customerId) ?? null,
    resource: state.resources.find((r) => r.id === booking.resourceId) ?? null,
    session: state.sessions.find((s) => s.bookingId === booking.id) ?? null,
  })
}

function pick(obj, keys) {
  if (!obj) return null
  return Object.fromEntries(keys.map((k) => [k, obj[k]]))
}

function sessionOf(state, bookingId) {
  return state.sessions.find((s) => s.bookingId === bookingId) ?? null
}

// filters: { hubId, branchId, customerId, resourceId, status, paymentStatus, source,
//            date ('YYYY-MM-DD', bookings starting that local day), query }
// status / paymentStatus / source may be a single value or an array. Newest start first.
export async function listBookings(filters = {}) {
  const state = store.getState()
  const list = (v) => (v == null ? null : Array.isArray(v) ? v : [v])
  const status = list(filters.status)
  const payment = list(filters.paymentStatus)
  const source = list(filters.source)
  const q = filters.query?.trim().toLowerCase()

  return state.bookings
    .filter((b) => !filters.hubId || b.hubId === filters.hubId)
    .filter((b) => !filters.branchId || b.branchId === filters.branchId)
    .filter((b) => !filters.customerId || b.customerId === filters.customerId)
    .filter((b) => !filters.resourceId || b.resourceId === filters.resourceId)
    .filter((b) => !status || status.includes(b.status))
    .filter((b) => !payment || payment.includes(b.paymentStatus))
    .filter((b) => !source || source.includes(b.source))
    .filter((b) => !filters.date || toDateKey(b.startAt) === filters.date)
    .map((b) => enrichBooking(state, b))
    .filter(
      (b) =>
        !q ||
        b.reference.toLowerCase().includes(q) ||
        b.customer?.name.toLowerCase().includes(q) ||
        b.customer?.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    )
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
}

export async function getBookingById(bookingId) {
  const state = store.getState()
  return enrichBooking(state, requireEntity(state.bookings, bookingId, 'Booking'))
}

// input: { hubId, branchId?, customerId, resourceId, startAt, endAt, source,
//          paymentStatus? (UNPAID|PENDING|PAID), notes? }
// Every rule is re-checked here; availability results are never trusted.
export async function createBooking(input = {}) {
  const state = store.getState()
  const hub = requireEntity(state.hubs, input.hubId, 'Hub')
  const branch = resolveBranch(state, hub, input.branchId)
  const customer = requireEntity(state.customers, input.customerId, 'Customer')
  const resource = requireEntity(state.resources, input.resourceId, 'Resource')
  if (resource.hubId !== hub.id || resource.branchId !== branch.id) {
    throw invalid('This resource does not belong to the selected hub and branch.')
  }
  const source = requireOneOf(input.source, BookingSource, 'Source')
  const paymentStatus = input.paymentStatus ?? PaymentStatus.UNPAID
  if (![PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.PAID].includes(paymentStatus)) {
    throw invalid('A new booking can only be UNPAID, PENDING or PAID.', { field: 'paymentStatus' })
  }

  const { startAt, endAt } = input
  if (!isValidInstant(startAt) || !isValidInstant(endAt) || toMs(endAt) <= toMs(startAt)) {
    throw new ServiceError(ErrorCode.INVALID_TIME_RANGE, 'End time must be after start time.')
  }
  validateDuration(minutesBetween(startAt, endAt))

  const tolerance =
    source === BookingSource.ADMIN
      ? BOOKING_RULES.PAST_TOLERANCE_MINUTES.ADMIN
      : BOOKING_RULES.PAST_TOLERANCE_MINUTES.CUSTOMER
  if (toMs(startAt) < toMs(plusMinutes(now(), -tolerance))) {
    throw new ServiceError(ErrorCode.INVALID_TIME_RANGE, 'The start time is in the past.')
  }
  if (!isWithinOpeningHours(resolveOpeningHours(hub, branch), startAt, endAt)) {
    throw new ServiceError(
      ErrorCode.OUTSIDE_OPERATING_HOURS,
      'The selected time is outside opening hours.',
    )
  }

  if (!resource.isActive || resource.operationalStatus === OperationalStatus.OFFLINE) {
    throw new ServiceError(ErrorCode.RESOURCE_UNAVAILABLE, `${resource.name} is not available.`)
  }
  if (resource.operationalStatus === OperationalStatus.MAINTENANCE) {
    throw new ServiceError(
      ErrorCode.RESOURCE_UNDER_MAINTENANCE,
      `${resource.name} is under maintenance.`,
    )
  }

  const clashes = blockingIntervals(state, resource.id).filter((i) =>
    overlaps(startAt, endAt, i.start, i.end),
  )
  if (clashes.length) {
    throw new ServiceError(
      ErrorCode.BOOKING_CONFLICT,
      'This station is no longer available for the selected time.',
      { bookingIds: clashes.map((c) => c.bookingId) },
    )
  }

  const price = computePrice({
    hourlyRate: resource.hourlyRate,
    startAt,
    endAt,
    discounts: discountsForHub(state, hub.id),
  })
  const seq = store.nextSeq('booking')
  const stamp = now().toISOString()
  const booking = {
    id: `bk_${String(seq).padStart(3, '0')}`,
    reference: `GH-${String(seq).padStart(5, '0')}`,
    hubId: hub.id,
    branchId: branch.id,
    customerId: customer.id,
    resourceId: resource.id,
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    source,
    status: BOOKING_RULES.INITIAL_STATUS,
    paymentStatus,
    priceBreakdown: price,
    totalPrice: price.total,
    notes: input.notes?.trim() ?? '',
    createdAt: stamp,
    updatedAt: stamp,
  }
  store.update((s) => ({ ...s, bookings: [...s.bookings, booking] }))
  return getBookingById(booking.id)
}

// actor: { role: 'CUSTOMER' | 'STAFF', id? } - customers may only cancel their own bookings.
// Payment status is never touched; refunds are a separate workflow.
export async function cancelBooking(bookingId, actor) {
  const state = store.getState()
  const booking = requireEntity(state.bookings, bookingId, 'Booking')
  const verdict = getCancellationEligibility(booking, sessionOf(state, bookingId), actor)
  if (!verdict.allowed) {
    throw new ServiceError(ErrorCode.BOOKING_NOT_CANCELLABLE, verdict.reason)
  }
  store.update((s) => ({
    ...s,
    bookings: s.bookings.map((b) =>
      b.id === bookingId
        ? { ...b, status: BookingStatus.CANCELLED, updatedAt: now().toISOString() }
        : b,
    ),
  }))
  return getBookingById(bookingId)
}

// Mock-only state change; it never alters the booking status.
export async function updateBookingPaymentStatus(bookingId, status) {
  const state = store.getState()
  const booking = requireEntity(state.bookings, bookingId, 'Booking')
  requireOneOf(status, PaymentStatus, 'Payment status')
  if (status === PaymentStatus.REFUNDED && booking.paymentStatus !== PaymentStatus.PAID) {
    throw new ServiceError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      'Only a paid booking can be marked as refunded.',
    )
  }
  store.update((s) => ({
    ...s,
    bookings: s.bookings.map((b) =>
      b.id === bookingId ? { ...b, paymentStatus: status, updatedAt: now().toISOString() } : b,
    ),
  }))
  return getBookingById(bookingId)
}
