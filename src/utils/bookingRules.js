import { ActorRole, BOOKING_RULES, BookingStatus, SessionStatus } from './constants'
import { now } from './clock'
import { toMs } from './time'

// Pure so the UI can show the exact eligibility/reason next to the Cancel button.
// Returns { allowed, reason }.
export function getCancellationEligibility(booking, session, actor, at = now()) {
  const deny = (reason) => ({ allowed: false, reason })
  const hours = BOOKING_RULES.CANCEL_CUTOFF_MINUTES / 60

  if (actor?.role === ActorRole.CUSTOMER && actor.id !== booking.customerId) {
    return deny('You can only cancel your own bookings.')
  }
  if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
    return deny('Only pending or confirmed bookings can be cancelled.')
  }
  if (session && session.status !== SessionStatus.CANCELLED) {
    return deny('A session has already been started for this booking.')
  }
  const minutesToStart = (toMs(booking.startAt) - toMs(at)) / 60000
  if (minutesToStart <= 0) return deny('This booking has already started.')
  if (actor?.role !== ActorRole.STAFF && minutesToStart < BOOKING_RULES.CANCEL_CUTOFF_MINUTES) {
    return deny(`Customers can cancel up to ${hours} hours before the start time.`)
  }
  return {
    allowed: true,
    reason:
      actor?.role === ActorRole.STAFF
        ? 'Staff can cancel any future booking.'
        : `Free to cancel until ${hours} hours before the start time.`,
  }
}
