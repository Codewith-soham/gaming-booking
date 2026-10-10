import { BLOCKING_BOOKING_STATUSES, SessionStatus } from './constants'
import { toMs } from './time'

// The interval a booking actually keeps its resource busy, taking its session into account:
// - ACTIVE session: from the earlier start to the later of booked/expected end (late finish).
// - COMPLETED session: through the real end, so finishing early frees the rest of the slot.
export function effectiveInterval(booking, session) {
  let start = toMs(booking.startAt)
  let end = toMs(booking.endAt)
  if (session?.status === SessionStatus.ACTIVE) {
    start = Math.min(start, toMs(session.startedAt))
    end = Math.max(end, toMs(session.expectedEndAt))
  } else if (session?.status === SessionStatus.COMPLETED && session.actualEndAt) {
    start = Math.min(start, toMs(session.startedAt))
    end = toMs(session.actualEndAt)
  }
  return { start, end }
}

export function blockingIntervals(state, resourceId, { excludeBookingId } = {}) {
  const sessionByBooking = new Map(state.sessions.map((s) => [s.bookingId, s]))
  return state.bookings
    .filter(
      (b) =>
        b.resourceId === resourceId &&
        b.id !== excludeBookingId &&
        BLOCKING_BOOKING_STATUSES.includes(b.status),
    )
    .map((b) => ({ bookingId: b.id, ...effectiveInterval(b, sessionByBooking.get(b.id)) }))
}
