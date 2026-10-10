import { CURRENCY } from './constants'
import { minutesBetween } from './time'

// Single pricing function (pure). Whole INR rupees in the prototype; production APIs should use
// integer minor units.
// discounts: [{ id, label, percent, minDurationMinutes?, isActive? }] - the best single one applies.
export function computePrice({ hourlyRate, startAt, endAt, discounts = [] }) {
  const durationMinutes = minutesBetween(startAt, endAt)
  const baseAmount = Math.round((hourlyRate * durationMinutes) / 60)

  let best = null
  for (const d of discounts) {
    if (d.isActive === false) continue
    if (durationMinutes < (d.minDurationMinutes ?? 0)) continue
    const amount = Math.round((baseAmount * d.percent) / 100)
    if (amount > 0 && (!best || amount > best.amount)) {
      best = { id: d.id, label: d.label, percent: d.percent, amount }
    }
  }

  return {
    currency: CURRENCY,
    hourlyRate,
    durationMinutes,
    baseAmount,
    discount: best,
    total: baseAmount - (best?.amount ?? 0),
  }
}
