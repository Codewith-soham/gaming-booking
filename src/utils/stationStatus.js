import { BookingStatus, OperationalStatus, SessionStatus, StationState } from './constants'
import { now } from './clock'
import { toMs } from './time'

export const STATION_STATE_LABELS = Object.freeze({
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  OFFLINE: 'Offline',
})

// Explains the derivation for UI legends/tooltips.
export const STATION_STATE_HELP = Object.freeze({
  AVAILABLE: 'Operational and nothing reserved or running right now.',
  RESERVED: 'A booking covers this moment and its session has not started.',
  OCCUPIED: 'A session is in progress (set by staff when starting a session).',
  MAINTENANCE: 'Marked under maintenance by staff. Cannot be booked.',
  OFFLINE: 'Marked offline (or deactivated). Cannot be booked.',
})

// RESERVED / OCCUPIED are computed, never stored (DOMAIN-MODEL section 9).
export function deriveStationStatus(resource, bookings, sessions, atTime = now()) {
  if (!resource.isActive) return StationState.OFFLINE
  if (resource.operationalStatus === OperationalStatus.MAINTENANCE) return StationState.MAINTENANCE
  if (resource.operationalStatus === OperationalStatus.OFFLINE) return StationState.OFFLINE

  const t = toMs(atTime)
  const mine = bookings.filter((b) => b.resourceId === resource.id)
  const sessionByBooking = new Map(sessions.map((s) => [s.bookingId, s]))

  const occupied = mine.some((b) => sessionByBooking.get(b.id)?.status === SessionStatus.ACTIVE)
  if (occupied) return StationState.OCCUPIED

  const reserved = mine.some(
    (b) =>
      (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING) &&
      !sessionByBooking.has(b.id) &&
      toMs(b.startAt) <= t &&
      t < toMs(b.endAt),
  )
  return reserved ? StationState.RESERVED : StationState.AVAILABLE
}
