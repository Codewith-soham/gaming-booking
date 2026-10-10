import { SessionStatus as S } from '../utils/constants'
import { dayAt, plusMinutes } from '../utils/time'
import { seedAnchor } from './bookings'

// Sessions for the seeded bookings that have one (see bookings.js).
export function buildSessions(now) {
  const a = seedAnchor(now)
  const iso = (d) => d.toISOString()
  return [
    {
      id: 'ses_001',
      bookingId: 'bk_001',
      startedAt: iso(plusMinutes(a, -30)),
      expectedEndAt: iso(plusMinutes(a, 30)),
      actualEndAt: null,
      status: S.ACTIVE,
      extensionCount: 0,
    },
    {
      id: 'ses_002',
      bookingId: 'bk_007',
      startedAt: iso(dayAt(now, -1, '16:05')),
      expectedEndAt: iso(dayAt(now, -1, '18:00')),
      actualEndAt: iso(dayAt(now, -1, '18:00')),
      status: S.COMPLETED,
      extensionCount: 0,
    },
    {
      id: 'ses_003',
      bookingId: 'bk_008',
      startedAt: iso(dayAt(now, -1, '19:00')),
      expectedEndAt: iso(dayAt(now, -1, '20:00')),
      actualEndAt: iso(dayAt(now, -1, '20:00')),
      status: S.COMPLETED,
      extensionCount: 0,
    },
  ]
}
