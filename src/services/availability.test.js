import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSeed } from '../data/seed'
import {
  at,
  bookingInput,
  expectCode,
  FIXED_NOW,
  setupDomain,
  STAFF,
  teardownDomain,
} from '../test/helpers'
import { getAvailability } from './availabilityService'
import { cancelBooking, createBooking } from './bookingService'
import { setOperationalStatus } from './resourceService'
import { store } from './store'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

const query = (overrides = {}) => ({
  hubId: 'hub_pixel',
  branchId: 'br_kp',
  date: '2026-10-13',
  durationMinutes: 60,
  ...overrides,
})

const slotsOf = (result, resourceId) =>
  result.resources.find((r) => r.resource.id === resourceId)?.slots ?? null

describe('getAvailability', () => {
  it('excludes MAINTENANCE and OFFLINE resources from the bookable list', async () => {
    const result = await getAvailability(query({ resourceType: 'PC' }))
    const ids = result.resources.map((r) => r.resource.id)
    expect(ids).not.toContain('res_kp_pc05')
    expect(ids).not.toContain('res_kp_pc06')
    expect(result.excluded.map((e) => [e.resource.id, e.code]).sort()).toEqual([
      ['res_kp_pc05', 'RESOURCE_UNDER_MAINTENANCE'],
      ['res_kp_pc06', 'RESOURCE_UNAVAILABLE'],
    ])
  })

  it('generates slots across opening hours in 30-minute steps', async () => {
    const result = await getAvailability(query({ resourceId: 'res_kp_pc03' }))
    const slots = slotsOf(result, 'res_kp_pc03')
    expect(slots[0].startAt).toBe(at('10:00', 1).toISOString())
    expect(slots.at(-1).endAt).toBe(at('23:00', 1).toISOString())
    expect(slots).toHaveLength(25) // 10:00 .. 22:00 starts
  })

  it('removes slots that overlap a booking but keeps adjacent ones', async () => {
    await createBooking(
      bookingInput({ startAt: at('14:00', 1).toISOString(), endAt: at('15:00', 1).toISOString() }),
    )
    const slots = slotsOf(
      await getAvailability(query({ resourceId: 'res_kp_pc03' })),
      'res_kp_pc03',
    )
    const starts = slots.map((s) => s.startAt)
    expect(starts).not.toContain(at('13:30', 1).toISOString())
    expect(starts).not.toContain(at('14:00', 1).toISOString())
    expect(starts).not.toContain(at('14:30', 1).toISOString())
    expect(starts).toContain(at('13:00', 1).toISOString())
    expect(starts).toContain(at('15:00', 1).toISOString())
  })

  it('frees slots again when a booking is cancelled', async () => {
    const booking = await createBooking(bookingInput())
    await cancelBooking(booking.id, STAFF)
    const slots = slotsOf(
      await getAvailability(query({ resourceId: 'res_kp_pc03' })),
      'res_kp_pc03',
    )
    expect(slots.map((s) => s.startAt)).toContain(at('14:00', 1).toISOString())
  })

  it('does not offer past slots today', async () => {
    const slots = slotsOf(
      await getAvailability(query({ date: '2026-10-12', resourceId: 'res_kp_pc03' })),
      'res_kp_pc03',
    )
    expect(slots[0].startAt).toBe(at('12:30').toISOString()) // now is 12:10
  })

  it("accounts for the running session on today's date", async () => {
    const slots = slotsOf(
      await getAvailability(query({ date: '2026-10-12', resourceId: 'res_kp_pc01' })),
      'res_kp_pc01',
    )
    // bk_001 (running, ends 12:30) and bk_002 (12:30-14:00) leave 14:00 as the first free start
    expect(slots[0].startAt).toBe(at('14:00').toISOString())
  })

  it('drops a station once it enters maintenance and brings it back when restored', async () => {
    await setOperationalStatus('res_kp_pc04', 'MAINTENANCE')
    let ids = (await getAvailability(query())).resources.map((r) => r.resource.id)
    expect(ids).not.toContain('res_kp_pc04')
    await setOperationalStatus('res_kp_pc04', 'AVAILABLE')
    ids = (await getAvailability(query())).resources.map((r) => r.resource.id)
    expect(ids).toContain('res_kp_pc04')
  })

  it('filters by resource type', async () => {
    const result = await getAvailability(query({ resourceType: 'PS5' }))
    expect(result.resources.map((r) => r.resource.type)).toEqual(['PS5', 'PS5'])
  })

  it('reports a closed day with no slots', async () => {
    const seed = buildSeed(FIXED_NOW)
    seed.branches = seed.branches.map((b) =>
      b.id === 'br_kp' ? { ...b, openingHours: { ...b.openingHours, 2: null } } : b,
    )
    store.reset(seed)
    const result = await getAvailability(query())
    expect(result.closed).toBe(true)
    expect(result.openingWindow).toBeNull()
    expect(result.resources.every((r) => r.slots.length === 0)).toBe(true)
  })

  it('validates input and ids', async () => {
    await expectCode(getAvailability(query({ hubId: 'nope' })), 'NOT_FOUND')
    await expectCode(getAvailability(query({ resourceId: 'nope' })), 'NOT_FOUND')
    await expectCode(getAvailability(query({ date: '13/10/2026' })), 'INVALID_INPUT')
    await expectCode(getAvailability(query({ durationMinutes: 45 })), 'INVALID_TIME_RANGE')
    await expectCode(getAvailability(query({ branchId: undefined })), 'INVALID_INPUT')
    await expectCode(getAvailability(query({ resourceType: 'TOASTER' })), 'INVALID_INPUT')
  })
})
