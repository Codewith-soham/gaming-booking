import { dateAt, parseDateKey, toDateKey, toMs } from './time'

// openingHours: { 0..6 (Sun..Sat): { open: 'HH:mm', close: 'HH:mm' } | null }
// Prototype limitation: a day's window cannot cross midnight.
export function weeklyHours(open, close, closedDays = []) {
  const hours = {}
  for (let day = 0; day < 7; day += 1) {
    hours[day] = closedDays.includes(day) ? null : { open, close }
  }
  return hours
}

export function getOpeningWindow(openingHours, dateKey) {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  const day = new Date(parsed.y, parsed.m - 1, parsed.d).getDay()
  const window = openingHours?.[day]
  if (!window) return null
  return { open: dateAt(dateKey, window.open), close: dateAt(dateKey, window.close) }
}

export function isWithinOpeningHours(openingHours, startAt, endAt) {
  const window = getOpeningWindow(openingHours, toDateKey(startAt))
  if (!window) return false
  return toMs(startAt) >= window.open.getTime() && toMs(endAt) <= window.close.getTime()
}

// A branch's own hours win; otherwise fall back to the hub's.
export function resolveOpeningHours(hub, branch) {
  return branch?.openingHours ?? hub.openingHours
}
