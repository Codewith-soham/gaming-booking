import { now } from '../utils/clock'
import { BookingStatus, PaymentStatus, SessionStatus, StationState } from '../utils/constants'
import { toDateKey, toMs } from '../utils/time'
import { enrichBooking } from './bookingService'
import { clone } from './helpers'
import { listStationStates } from './resourceService'
import { store } from './store'

const LIVE = [BookingStatus.PENDING, BookingStatus.CONFIRMED]

// Dashboard numbers for a hub (and optionally one branch), derived from shared state.
// "Booked value" = total of non-cancelled bookings starting today; "Paid" = the PAID part of that.
// Revenue definitions are still an open question (see OPEN-QUESTIONS), so these are demo figures.
export async function getDashboardStats({ hubId, branchId } = {}) {
  const state = store.getState()
  const at = now()
  const today = toDateKey(at)
  const inScope = (b) => (!hubId || b.hubId === hubId) && (!branchId || b.branchId === branchId)

  const scoped = state.bookings.filter(inScope)
  const todays = scoped.filter((b) => toDateKey(b.startAt) === today)
  const standing = todays.filter((b) => b.status !== BookingStatus.CANCELLED)

  const count = (list, key) =>
    list.reduce((acc, b) => ({ ...acc, [b[key]]: (acc[b[key]] ?? 0) + 1 }), {})

  const stations = await listStationStates({ hubId, branchId })
  const byState = Object.fromEntries(Object.values(StationState).map((k) => [k, 0]))
  for (const s of stations) byState[s.state] += 1

  const upcoming = scoped
    .filter((b) => LIVE.includes(b.status) && toMs(b.endAt) > toMs(at))
    .filter((b) => !state.sessions.some((x) => x.bookingId === b.id))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 6)
    .map((b) => enrichBooking(state, b))

  const activeSessions = state.sessions.filter(
    (x) =>
      x.status === SessionStatus.ACTIVE &&
      inScope(state.bookings.find((b) => b.id === x.bookingId) ?? {}),
  ).length

  return clone({
    date: today,
    bookingsToday: todays.length,
    bookedValueToday: standing.reduce((sum, b) => sum + b.totalPrice, 0),
    paidToday: standing
      .filter((b) => b.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, b) => sum + b.totalPrice, 0),
    outstandingToday: standing
      .filter((b) => b.paymentStatus !== PaymentStatus.PAID)
      .reduce((sum, b) => sum + b.totalPrice, 0),
    activeSessions,
    stationsTotal: stations.length,
    stationsByState: byState,
    todayBySource: count(todays, 'source'),
    todayByStatus: count(todays, 'status'),
    upcoming,
  })
}
