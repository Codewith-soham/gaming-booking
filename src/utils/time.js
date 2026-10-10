// Prototype note: dates are interpreted in the browser's local timezone. Production should
// store UTC and render in the hub's timezone (README baseline decision).

export function toMs(value) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return new Date(value).getTime()
}

export function isValidInstant(value) {
  return value != null && Number.isFinite(toMs(value))
}

// Half-open overlap test from the PRD: requestedStart < existingEnd && requestedEnd > existingStart
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMs(aStart) < toMs(bEnd) && toMs(aEnd) > toMs(bStart)
}

export function plusMinutes(value, minutes) {
  return new Date(toMs(value) + minutes * 60000)
}

export function minutesBetween(start, end) {
  return Math.round((toMs(end) - toMs(start)) / 60000)
}

export function pad(n, width = 2) {
  return String(n).padStart(width, '0')
}

// Local calendar day as 'YYYY-MM-DD'.
export function toDateKey(value) {
  const d = new Date(toMs(value))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '')
  if (!match) return null
  const [y, m, d] = match.slice(1).map(Number)
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null
  return { y, m, d }
}

// 'YYYY-MM-DD' + 'HH:mm' -> local Date
export function dateAt(dateKey, hhmm) {
  const p = parseDateKey(dateKey)
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(p.y, p.m - 1, p.d, h, m, 0, 0)
}

// Local day `dayOffset` days from `base`, at 'HH:mm'.
export function dayAt(base, dayOffset, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

export function floorToIncrement(value, minutes) {
  const d = new Date(toMs(value))
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - (d.getMinutes() % minutes))
  return d
}
