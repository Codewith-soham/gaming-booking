import { now } from '../utils/clock'
import {
  BOOKING_RULES,
  BookingStatus,
  ErrorCode,
  OperationalStatus,
  SessionStatus,
} from '../utils/constants'
import { ServiceError } from '../utils/errors'
import { isWithinOpeningHours, resolveOpeningHours } from '../utils/hours'
import { blockingIntervals } from '../utils/occupancy'
import { computePrice } from '../utils/price'
import { overlaps, plusMinutes, toMs } from '../utils/time'
import { enrichBooking } from './bookingService'
import { clone, invalid, requireEntity } from './helpers'
import { discountsForHub } from './pricingService'
import { store } from './store'

function fail(code, message, details) {
  return new ServiceError(code, message, details)
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// A session is returned joined with its booking, resource and customer.
function joinSession(state, session) {
  const booking = state.bookings.find((b) => b.id === session.bookingId)
  const full = enrichBooking(state, booking)
  return clone({
    ...session,
    booking: { ...full, session: undefined },
    resource: full.resource,
    customer: full.customer,
  })
}

function joinNotStarted(state, booking) {
  const full = enrichBooking(state, booking)
  return clone({
    id: null,
    bookingId: booking.id,
    startedAt: null,
    expectedEndAt: booking.endAt,
    actualEndAt: null,
    status: SessionStatus.NOT_STARTED,
    extensionCount: 0,
    booking: { ...full, session: undefined },
    resource: full.resource,
    customer: full.customer,
  })
}

// A session starts from a CONFIRMED booking, from START_EARLY_MINUTES before its start until its
// end. A late start does not extend the booked end (prototype rule; see OPEN-QUESTIONS).
export async function startSession(bookingId) {
  const state = store.getState()
  const booking = requireEntity(state.bookings, bookingId, 'Booking')
  const resource = requireEntity(state.resources, booking.resourceId, 'Resource')
  const existing = state.sessions.find((s) => s.bookingId === bookingId)

  if (existing?.status === SessionStatus.ACTIVE) {
    throw fail(ErrorCode.SESSION_ALREADY_ACTIVE, 'A session is already running for this booking.')
  }
  if (existing || booking.status !== BookingStatus.CONFIRMED) {
    throw fail(
      ErrorCode.INVALID_STATUS_TRANSITION,
      existing
        ? 'This booking has already had its session.'
        : 'Only a confirmed booking can start a session.',
    )
  }
  if (!resource.isActive || resource.operationalStatus === OperationalStatus.OFFLINE) {
    throw fail(ErrorCode.RESOURCE_UNAVAILABLE, `${resource.name} is not available.`)
  }
  if (resource.operationalStatus === OperationalStatus.MAINTENANCE) {
    throw fail(ErrorCode.RESOURCE_UNDER_MAINTENANCE, `${resource.name} is under maintenance.`)
  }
  const busy = state.sessions.some(
    (s) =>
      s.status === SessionStatus.ACTIVE &&
      state.bookings.find((b) => b.id === s.bookingId)?.resourceId === resource.id,
  )
  if (busy) {
    throw fail(ErrorCode.SESSION_ALREADY_ACTIVE, `${resource.name} already has a running session.`)
  }

  const at = now()
  const opensAt = plusMinutes(booking.startAt, -BOOKING_RULES.START_EARLY_MINUTES)
  if (toMs(at) < toMs(opensAt)) {
    throw fail(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Too early. This session can start from ${timeLabel(opensAt)}.`,
    )
  }
  if (toMs(at) >= toMs(booking.endAt)) {
    throw fail(ErrorCode.INVALID_STATUS_TRANSITION, 'The booked time has already ended.')
  }

  const session = {
    id: `ses_${String(store.nextSeq('session')).padStart(3, '0')}`,
    bookingId,
    startedAt: at.toISOString(),
    expectedEndAt: booking.endAt,
    actualEndAt: null,
    status: SessionStatus.ACTIVE,
    extensionCount: 0,
  }
  store.update((s) => ({ ...s, sessions: [...s.sessions, session] }))
  return joinSession(store.getState(), session)
}

// Checks the added interval against every other booking on the resource and the opening hours
// before changing anything. The booking's end and price follow the session.
export async function extendSession(bookingId, additionalMinutes) {
  const state = store.getState()
  const booking = requireEntity(state.bookings, bookingId, 'Booking')
  const session = state.sessions.find((s) => s.bookingId === bookingId)
  if (session?.status !== SessionStatus.ACTIVE) {
    throw fail(ErrorCode.INVALID_STATUS_TRANSITION, 'Only a running session can be extended.')
  }
  const step = BOOKING_RULES.SLOT_INCREMENT_MINUTES
  if (!Number.isInteger(additionalMinutes) || additionalMinutes <= 0 || additionalMinutes % step) {
    throw invalid(`Extension must be a positive multiple of ${step} minutes.`, {
      field: 'additionalMinutes',
    })
  }

  const currentEnd = plusMinutes(session.expectedEndAt, 0)
  const newEnd = plusMinutes(currentEnd, additionalMinutes)

  const hub = state.hubs.find((h) => h.id === booking.hubId)
  const branch = state.branches.find((b) => b.id === booking.branchId)
  if (!isWithinOpeningHours(resolveOpeningHours(hub, branch), booking.startAt, newEnd)) {
    throw fail(ErrorCode.OUTSIDE_OPERATING_HOURS, 'The extension would run past closing time.')
  }

  const clashes = blockingIntervals(state, booking.resourceId, { excludeBookingId: bookingId })
    .filter((i) => overlaps(currentEnd, newEnd, i.start, i.end))
    .map((i) => state.bookings.find((b) => b.id === i.bookingId))
  if (clashes.length) {
    const refs = clashes.map((b) => b.reference).join(', ')
    throw fail(
      ErrorCode.SESSION_EXTENSION_CONFLICT,
      `Cannot extend: the station is booked in that time (${refs}).`,
      { bookingIds: clashes.map((b) => b.id) },
    )
  }

  const resource = state.resources.find((r) => r.id === booking.resourceId)
  const price = computePrice({
    hourlyRate: resource.hourlyRate,
    startAt: booking.startAt,
    endAt: newEnd,
    discounts: discountsForHub(state, hub.id),
  })
  const stamp = now().toISOString()
  store.update((s) => ({
    ...s,
    sessions: s.sessions.map((x) =>
      x.id === session.id
        ? { ...x, expectedEndAt: newEnd.toISOString(), extensionCount: x.extensionCount + 1 }
        : x,
    ),
    bookings: s.bookings.map((b) =>
      b.id === bookingId
        ? {
            ...b,
            endAt: newEnd.toISOString(),
            priceBreakdown: price,
            totalPrice: price.total,
            updatedAt: stamp,
          }
        : b,
    ),
  }))
  const updated = store.getState().sessions.find((s) => s.id === session.id)
  return joinSession(store.getState(), updated)
}

// Records the real end, completes the booking, and leaves payment status alone.
export async function completeSession(bookingId) {
  const state = store.getState()
  requireEntity(state.bookings, bookingId, 'Booking')
  const session = state.sessions.find((s) => s.bookingId === bookingId)
  if (session?.status !== SessionStatus.ACTIVE) {
    throw fail(ErrorCode.INVALID_STATUS_TRANSITION, 'Only a running session can be completed.')
  }
  const at = now().toISOString()
  store.update((s) => ({
    ...s,
    sessions: s.sessions.map((x) =>
      x.id === session.id ? { ...x, status: SessionStatus.COMPLETED, actualEndAt: at } : x,
    ),
    bookings: s.bookings.map((b) =>
      b.id === bookingId ? { ...b, status: BookingStatus.COMPLETED, updatedAt: at } : b,
    ),
  }))
  const updated = store.getState().sessions.find((s) => s.id === session.id)
  return joinSession(store.getState(), updated)
}

// filters: { hubId, branchId, status } where status is NOT_STARTED | ACTIVE | COMPLETED.
// NOT_STARTED lists confirmed bookings that have not ended and have no session yet.
export async function listSessions(filters = {}) {
  const state = store.getState()
  const inScope = (booking) =>
    booking &&
    (!filters.hubId || booking.hubId === filters.hubId) &&
    (!filters.branchId || booking.branchId === filters.branchId)
  const wanted = (status) => !filters.status || filters.status === status

  const real = state.sessions
    .filter((s) => wanted(s.status) && inScope(state.bookings.find((b) => b.id === s.bookingId)))
    .map((s) => joinSession(state, s))

  const t = toMs(now())
  const upcoming = wanted(SessionStatus.NOT_STARTED)
    ? state.bookings
        .filter(
          (b) =>
            inScope(b) &&
            b.status === BookingStatus.CONFIRMED &&
            toMs(b.endAt) > t &&
            !state.sessions.some((s) => s.bookingId === b.id),
        )
        .map((b) => joinNotStarted(state, b))
    : []

  return [...real, ...upcoming].sort((a, b) =>
    (a.startedAt ?? a.booking.startAt).localeCompare(b.startedAt ?? b.booking.startAt),
  )
}
