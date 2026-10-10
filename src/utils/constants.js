const makeEnum = (...keys) => Object.freeze(Object.fromEntries(keys.map((k) => [k, k])))

export const ResourceType = makeEnum('PC', 'PS5', 'XBOX', 'RACING_SIMULATOR', 'VR', 'OTHER')
export const OperationalStatus = makeEnum('AVAILABLE', 'MAINTENANCE', 'OFFLINE')
export const BookingStatus = makeEnum('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')
export const PaymentStatus = makeEnum('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED')
// EXTENDED is kept for display only: an extended session stays ACTIVE and bumps `extensionCount`.
export const SessionStatus = makeEnum('NOT_STARTED', 'ACTIVE', 'COMPLETED', 'EXTENDED', 'CANCELLED')
export const BookingSource = makeEnum('WEBSITE', 'WHATSAPP', 'ADMIN')
export const ActorRole = makeEnum('CUSTOMER', 'STAFF')
// Derived presentation states for a station (never stored).
export const StationState = makeEnum('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OFFLINE')

export const ErrorCode = makeEnum(
  'NOT_FOUND',
  'INVALID_INPUT',
  'INVALID_TIME_RANGE',
  'OUTSIDE_OPERATING_HOURS',
  'RESOURCE_UNAVAILABLE',
  'RESOURCE_UNDER_MAINTENANCE',
  'BOOKING_CONFLICT',
  'BOOKING_NOT_CANCELLABLE',
  'SESSION_ALREADY_ACTIVE',
  'SESSION_EXTENSION_CONFLICT',
  'INVALID_STATUS_TRANSITION',
)

export const RESOURCE_TYPE_LABELS = Object.freeze({
  PC: 'PC',
  PS5: 'PlayStation 5',
  XBOX: 'Xbox',
  RACING_SIMULATOR: 'Racing simulator',
  VR: 'VR',
  OTHER: 'Other',
})

// Prototype policy knobs. These are open questions in OPEN-QUESTIONS.md; keep them in one place.
export const BOOKING_RULES = Object.freeze({
  SLOT_INCREMENT_MINUTES: 30,
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 240,
  // Customers can cancel until this long before start. Staff are exempt.
  CANCEL_CUTOFF_MINUTES: 120,
  // A session may start this long before the reserved start.
  START_EARLY_MINUTES: 15,
  // How far in the past a booking start may be (walk-ins who already sat down).
  PAST_TOLERANCE_MINUTES: Object.freeze({ CUSTOMER: 5, ADMIN: 30 }),
  // The prototype auto-confirms; there is no approval step.
  INITIAL_STATUS: BookingStatus.CONFIRMED,
})

// Booking statuses whose interval keeps a resource occupied.
// CANCELLED and NO_SHOW free the interval.
export const BLOCKING_BOOKING_STATUSES = Object.freeze([
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
])

export const CURRENCY = 'INR'
