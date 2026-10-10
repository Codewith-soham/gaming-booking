import { describe, expect, it } from 'vitest'
import { formatDateTimeRange, formatHHmm, formatTime, summarizeOpeningHours } from './format'

describe('12-hour time formatting', () => {
  it('formats times with AM/PM, handling midnight and noon', () => {
    expect(formatTime(new Date(2026, 9, 13, 0, 0))).toBe('12:00 AM')
    expect(formatTime(new Date(2026, 9, 13, 0, 30))).toBe('12:30 AM')
    expect(formatTime(new Date(2026, 9, 13, 9, 5))).toBe('9:05 AM')
    expect(formatTime(new Date(2026, 9, 13, 12, 0))).toBe('12:00 PM')
    expect(formatTime(new Date(2026, 9, 13, 14, 30))).toBe('2:30 PM')
    expect(formatTime(new Date(2026, 9, 13, 23, 59))).toBe('11:59 PM')
  })

  it('converts stored HH:mm strings', () => {
    expect(formatHHmm('10:00')).toBe('10:00 AM')
    expect(formatHHmm('23:30')).toBe('11:30 PM')
    expect(formatHHmm('00:00')).toBe('12:00 AM')
  })

  it('formats ranges and opening hours', () => {
    expect(formatDateTimeRange(new Date(2026, 9, 13, 14, 0), new Date(2026, 9, 13, 15, 30))).toBe(
      'Tue 13 Oct 2026, 2:00 PM - 3:30 PM',
    )
    const week = Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [d, d === 1 ? null : { open: '10:00', close: '22:00' }]),
    )
    expect(summarizeOpeningHours(week)).toEqual([
      { days: 'Mon', hours: 'Closed' },
      { days: 'Tue-Sun', hours: '10:00 AM - 10:00 PM' },
    ])
  })
})
