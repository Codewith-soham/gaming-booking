import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSeed } from '../data/seed'
import { at, expectCode, FIXED_NOW, setupDomain, teardownDomain } from '../test/helpers'
import { getCancellationEligibility } from '../utils/bookingRules'
import { computePrice } from '../utils/price'
import { deriveStationStatus } from '../utils/stationStatus'
import { createBooking } from './bookingService'
import {
  createCustomer,
  getCurrentCustomer,
  getCustomerById,
  listCustomers,
} from './customerService'
import { resetDemoData } from './demoService'
import { getHubById, getHubBySlug, listBranches, listHubs } from './hubService'
import { calculatePrice, getPricingForHub } from './pricingService'
import { getResourceById } from './resourceService'
import { store } from './store'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

describe('demo data', () => {
  it('reset restores the seed after changes', async () => {
    await createCustomer({ name: 'New Person', phone: '+91 98765 43210' })
    await createBooking({
      hubId: 'hub_nova',
      customerId: 'cust_001',
      resourceId: 'res_nova_pc03',
      startAt: at('15:00', 1).toISOString(),
      endAt: at('16:00', 1).toISOString(),
      source: 'WEBSITE',
    })
    expect(store.getState()).not.toEqual(buildSeed(FIXED_NOW))
    await resetDemoData()
    expect(store.getState()).toEqual(buildSeed(FIXED_NOW))
  })

  it('persists to localStorage and survives a state reload', () => {
    const saved = JSON.parse(localStorage.getItem('gaming-hub-demo-state'))
    expect(saved.bookings).toHaveLength(13)
    expect(saved.meta.seedDate).toBe('2026-10-12')
  })

  it('seed is internally consistent', () => {
    const s = store.getState()
    for (const b of s.bookings) {
      const r = s.resources.find((x) => x.id === b.resourceId)
      expect(r, b.id).toBeTruthy()
      expect(r.hubId).toBe(b.hubId)
      expect(r.branchId).toBe(b.branchId)
      expect(s.customers.some((c) => c.id === b.customerId)).toBe(true)
      expect(new Date(b.endAt) > new Date(b.startAt)).toBe(true)
    }
    for (const h of s.hubs) {
      expect([...h.branchIds].sort()).toEqual(
        s.branches
          .filter((b) => b.hubId === h.id)
          .map((b) => b.id)
          .sort(),
      )
    }
  })

  it('seed never has overlapping blocking bookings on a resource', () => {
    const s = store.getState()
    const blocking = s.bookings.filter((b) =>
      ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status),
    )
    for (const a of blocking) {
      for (const b of blocking) {
        if (a.id >= b.id || a.resourceId !== b.resourceId) continue
        const clash =
          new Date(a.startAt) < new Date(b.endAt) && new Date(a.endAt) > new Date(b.startAt)
        expect(clash, `${a.id} vs ${b.id}`).toBe(false)
      }
    }
  })
})

describe('hubService', () => {
  it('lists published hubs with a derived summary', async () => {
    const hubs = await listHubs()
    expect(hubs.map((h) => h.slug)).toEqual(['pixel-arena', 'nova-gaming-lounge', 'rift-racing-vr'])
    const pixel = hubs[0]
    expect(pixel.summary).toMatchObject({ branchCount: 2, minHourlyRate: 70 })
    expect(pixel.summary.resourceTypes).toEqual(
      expect.arrayContaining(['PC', 'PS5', 'XBOX', 'RACING_SIMULATOR']),
    )
  })

  it('filters by query, city, resource type, amenity, price and publication', async () => {
    expect((await listHubs({ query: 'nova' })).map((h) => h.id)).toEqual(['hub_nova'])
    expect((await listHubs({ city: 'pune' })).map((h) => h.id)).toEqual(['hub_pixel'])
    expect((await listHubs({ resourceType: 'VR' })).map((h) => h.id)).toEqual([
      'hub_nova',
      'hub_rift',
    ])
    expect((await listHubs({ amenity: 'VR room' })).map((h) => h.id)).toEqual(['hub_nova'])
    expect((await listHubs({ maxHourlyRate: 80 })).map((h) => h.id)).toEqual(['hub_pixel'])
    store.update((s) => ({
      ...s,
      hubs: s.hubs.map((h) => (h.id === 'hub_nova' ? { ...h, isPublished: false } : h)),
    }))
    expect((await listHubs()).map((h) => h.id)).not.toContain('hub_nova')
    expect((await listHubs({ includeUnpublished: true })).map((h) => h.id)).toContain('hub_nova')
  })

  it('counts stations available right now from derived status', async () => {
    const pixel = await getHubById('hub_pixel')
    // 9 KP + 5 Baner = 14; not available now: PC-01 occupied, PC-02 reserved, PC-05 maint, PC-06 off
    expect(pixel.summary.resourceCount).toBe(14)
    expect(pixel.summary.availableNow).toBe(14 - 4)
  })

  it('gets hubs and branches, and reports NOT_FOUND', async () => {
    expect((await getHubBySlug('rift-racing-vr')).id).toBe('hub_rift')
    expect((await listBranches('hub_pixel')).map((b) => b.id)).toEqual(['br_kp', 'br_baner'])
    await expectCode(getHubBySlug('nope'), 'NOT_FOUND')
    await expectCode(getHubById('nope'), 'NOT_FOUND')
    await expectCode(listBranches('nope'), 'NOT_FOUND')
  })
})

describe('pricingService', () => {
  const resource = { hubId: 'hub_pixel', hourlyRate: 80 }

  it('prices by duration in whole rupees', async () => {
    const price = await calculatePrice({
      resource,
      startAt: at('10:00', 1),
      endAt: at('11:30', 1),
    })
    expect(price).toMatchObject({
      durationMinutes: 90,
      baseAmount: 120,
      total: 120,
      discount: null,
    })
  })

  it('applies the best applicable discount only', async () => {
    const rules = [
      { id: 'a', label: 'A', percent: 10, minDurationMinutes: 60 },
      { id: 'b', label: 'B', percent: 20, minDurationMinutes: 180 },
    ]
    const two = computePrice({
      hourlyRate: 100,
      startAt: at('10:00'),
      endAt: at('12:00'),
      discounts: rules,
    })
    expect(two.discount.id).toBe('a')
    expect(two.total).toBe(180)
    const four = computePrice({
      hourlyRate: 100,
      startAt: at('10:00'),
      endAt: at('14:00'),
      discounts: rules,
    })
    expect(four.discount.id).toBe('b')
    expect(four.total).toBe(320)
  })

  it('ignores inactive discounts and rejects bad input', async () => {
    const off = computePrice({
      hourlyRate: 100,
      startAt: at('10:00'),
      endAt: at('14:00'),
      discounts: [{ id: 'x', label: 'x', percent: 50, isActive: false }],
    })
    expect(off.discount).toBeNull()
    await expectCode(
      calculatePrice({ resource, startAt: at('11:00'), endAt: at('10:00') }),
      'INVALID_TIME_RANGE',
    )
    await expectCode(
      calculatePrice({ resource: null, startAt: at('10:00'), endAt: at('11:00') }),
      'INVALID_INPUT',
    )
  })

  it('lists rates and discounts for a hub or branch', async () => {
    const all = await getPricingForHub('hub_pixel')
    expect(all.rates).toHaveLength(14)
    expect(all.discounts.map((d) => d.id)).toEqual(['rule_pixel_long'])
    const baner = await getPricingForHub('hub_pixel', 'br_baner')
    expect(baner.rates).toHaveLength(5)
    await expectCode(getPricingForHub('nope'), 'NOT_FOUND')
  })
})

describe('deriveStationStatus', () => {
  const state = () => store.getState()
  const status = async (id, when = FIXED_NOW) =>
    deriveStationStatus(await getResourceById(id), state().bookings, state().sessions, when)

  it('derives OCCUPIED, RESERVED, AVAILABLE, MAINTENANCE and OFFLINE', async () => {
    expect(await status('res_kp_pc01')).toBe('OCCUPIED') // running session
    expect(await status('res_kp_pc02')).toBe('RESERVED') // booked now, not started
    expect(await status('res_kp_pc04')).toBe('AVAILABLE')
    expect(await status('res_kp_pc05')).toBe('MAINTENANCE')
    expect(await status('res_kp_pc06')).toBe('OFFLINE')
  })

  it('reserved depends on the viewed time, and cancelled bookings do not reserve', async () => {
    expect(await status('res_kp_pc02', at('14:00'))).toBe('AVAILABLE')
    expect(await status('res_kp_pc03', at('13:30'))).toBe('AVAILABLE') // bk_006 is cancelled
  })

  it('treats a deactivated resource as offline', () => {
    const r = { id: 'x', isActive: false, operationalStatus: 'AVAILABLE' }
    expect(deriveStationStatus(r, [], [], FIXED_NOW)).toBe('OFFLINE')
  })
})

describe('getCancellationEligibility', () => {
  it('explains every outcome', () => {
    const base = { customerId: 'c1', status: 'CONFIRMED', startAt: at('18:00').toISOString() }
    const customer = { role: 'CUSTOMER', id: 'c1' }
    expect(getCancellationEligibility(base, null, customer, FIXED_NOW).allowed).toBe(true)
    expect(
      getCancellationEligibility(
        { ...base, startAt: at('13:00').toISOString() },
        null,
        customer,
        FIXED_NOW,
      ).reason,
    ).toMatch(/2 hours/)
    expect(
      getCancellationEligibility(base, null, { role: 'CUSTOMER', id: 'c2' }, FIXED_NOW).allowed,
    ).toBe(false)
    expect(
      getCancellationEligibility({ ...base, status: 'COMPLETED' }, null, customer, FIXED_NOW)
        .allowed,
    ).toBe(false)
  })
})

describe('customerService', () => {
  it('searches by name, phone digits and email', async () => {
    expect((await listCustomers({ query: 'kabir' })).map((c) => c.id)).toEqual(['cust_003'])
    expect((await listCustomers({ query: '90000 00002' })).map((c) => c.id)).toEqual(['cust_002'])
    expect((await listCustomers({ query: 'sana@' })).map((c) => c.id)).toEqual(['cust_008'])
    expect((await listCustomers({ hubId: 'hub_rift' })).map((c) => c.id)).toEqual(['cust_005'])
  })

  it('returns booking history and stats', async () => {
    const customer = await getCustomerById('cust_001')
    expect(customer.bookings.map((b) => b.id).sort()).toEqual(['bk_001', 'bk_006'])
    expect(customer.stats.bookingCount).toBe(2)
    expect(customer.stats.totalPaid).toBe(80) // bk_001 paid; bk_006 is cancelled so excluded
  })

  it('creates customers with validation and rejects duplicate phones', async () => {
    const created = await createCustomer({ name: ' Neha Joshi ', phone: '+91 98765 43210' })
    expect(created).toMatchObject({ id: 'cust_009', name: 'Neha Joshi' })
    await expectCode(createCustomer({ name: '', phone: '+91 98765 43211' }), 'INVALID_INPUT')
    await expectCode(createCustomer({ name: 'A', phone: '123' }), 'INVALID_INPUT')
    await expectCode(
      createCustomer({ name: 'A', phone: '98765 43212', email: 'bad' }),
      'INVALID_INPUT',
    )
    const dupe = await expectCode(
      createCustomer({ name: 'B', phone: '+919876543210' }),
      'INVALID_INPUT',
    )
    expect(dupe.details.customerId).toBe('cust_009')
  })

  it('has a demo current customer', async () => {
    expect((await getCurrentCustomer()).id).toBe('cust_001')
    await expectCode(getCustomerById('nope'), 'NOT_FOUND')
  })
})
