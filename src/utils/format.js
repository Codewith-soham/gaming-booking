import { CURRENCY, RESOURCE_TYPE_LABELS } from './constants'

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function typeLabel(type) {
  return RESOURCE_TYPE_LABELS[type] ?? type
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Display order Monday..Sunday
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Collapses weekly hours into readable rows, e.g. [{ days: 'Mon-Sun', hours: '10:00-23:00' }].
export function summarizeOpeningHours(openingHours) {
  const rows = []
  for (const day of DAY_ORDER) {
    const w = openingHours?.[day]
    const hours = w ? `${formatHHmm(w.open)} - ${formatHHmm(w.close)}` : 'Closed'
    const last = rows.at(-1)
    if (last && last.hours === hours) last.to = day
    else rows.push({ from: day, to: day, hours })
  }
  return rows.map((r) => ({
    days: r.from === r.to ? DAY_NAMES[r.from] : `${DAY_NAMES[r.from]}-${DAY_NAMES[r.to]}`,
    hours: r.hours,
  }))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n) => String(n).padStart(2, '0')

export function formatDate(value) {
  const d = new Date(value)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// 12-hour clock with AM/PM, e.g. "2:30 PM". Input is a Date/ISO string.
export function formatTime(value) {
  const d = new Date(value)
  return formatClock(d.getHours(), d.getMinutes())
}

function formatClock(hours, minutes) {
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return `${h12}:${p2(minutes)} ${suffix}`
}

// Converts a stored 'HH:mm' (24-hour) string such as an opening time to "10:00 AM".
export function formatHHmm(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return formatClock(h, m)
}

export function formatDateTimeRange(startAt, endAt) {
  return `${formatDate(startAt)}, ${formatTime(startAt)} - ${formatTime(endAt)}`
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
