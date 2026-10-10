import { BookingSource as Src, BookingStatus as B, PaymentStatus as P } from '../utils/constants'
import { computePrice } from '../utils/price'
import { dayAt, floorToIncrement, plusMinutes } from '../utils/time'
import { branches, hubs, pricingRules } from './hubs'
import { resources } from './resources'

// Seed bookings are laid out relative to `now`, so there is always something happening around the
// current moment. `anchor` is `now` floored to the half hour.
//
//   bk_001  active session on kp_pc01, ends exactly when bk_002 starts (extension conflict demo)
//   bk_003  confirmed, start time already reached, no session yet (ready to start)
//   bk_006  cancelled but still PAID (booking and payment status are independent)
export function seedAnchor(now) {
  return floorToIncrement(now, 30)
}

export function buildBookingSpecs(now) {
  const a = seedAnchor(now)
  const at = (min) => plusMinutes(a, min)
  const day = (offset, hhmm) => dayAt(now, offset, hhmm)
  const hr = (offset, from, to) => [day(offset, from), day(offset, to)]

  return [
    {
      n: 1,
      cust: 'cust_001',
      res: 'res_kp_pc01',
      when: [at(-30), at(30)],
      src: Src.WEBSITE,
      st: B.CONFIRMED,
      pay: P.PAID,
    },
    {
      n: 2,
      cust: 'cust_002',
      res: 'res_kp_pc01',
      when: [at(30), at(120)],
      src: Src.WEBSITE,
      st: B.CONFIRMED,
      pay: P.UNPAID,
    },
    {
      n: 3,
      cust: 'cust_003',
      res: 'res_kp_pc02',
      when: [at(0), at(60)],
      src: Src.ADMIN,
      st: B.CONFIRMED,
      pay: P.PAID,
      notes: 'Walk-in, paid at counter (demo)',
    },
    {
      n: 4,
      cust: 'cust_004',
      res: 'res_kp_ps501',
      when: hr(1, '18:00', '20:00'),
      src: Src.WHATSAPP,
      st: B.PENDING,
      pay: P.PENDING,
    },
    {
      n: 5,
      cust: 'cust_005',
      res: 'res_kp_xbox01',
      when: hr(1, '16:00', '17:00'),
      src: Src.WEBSITE,
      st: B.CONFIRMED,
      pay: P.UNPAID,
    },
    {
      n: 6,
      cust: 'cust_001',
      res: 'res_kp_pc03',
      when: [at(60), at(120)],
      src: Src.WEBSITE,
      st: B.CANCELLED,
      pay: P.PAID,
    },
    {
      n: 7,
      cust: 'cust_006',
      res: 'res_kp_pc02',
      when: hr(-1, '16:00', '18:00'),
      src: Src.WEBSITE,
      st: B.COMPLETED,
      pay: P.PAID,
    },
    {
      n: 8,
      cust: 'cust_007',
      res: 'res_kp_ps502',
      when: hr(-1, '19:00', '20:00'),
      src: Src.ADMIN,
      st: B.COMPLETED,
      pay: P.PAID,
    },
    {
      n: 9,
      cust: 'cust_002',
      res: 'res_kp_pc04',
      when: hr(-2, '14:00', '15:00'),
      src: Src.WEBSITE,
      st: B.NO_SHOW,
      pay: P.UNPAID,
    },
    {
      n: 10,
      cust: 'cust_008',
      res: 'res_kp_pc04',
      when: hr(-3, '20:00', '21:00'),
      src: Src.WHATSAPP,
      st: B.CANCELLED,
      pay: P.UNPAID,
    },
    {
      n: 11,
      cust: 'cust_003',
      res: 'res_nova_pc01',
      when: hr(1, '15:00', '17:00'),
      src: Src.WEBSITE,
      st: B.CONFIRMED,
      pay: P.PAID,
    },
    {
      n: 12,
      cust: 'cust_005',
      res: 'res_rift_vr01',
      when: hr(1, '13:00', '14:00'),
      src: Src.ADMIN,
      st: B.CONFIRMED,
      pay: P.UNPAID,
    },
    {
      n: 13,
      cust: 'cust_004',
      res: 'res_baner_pc01',
      when: [at(120), at(180)],
      src: Src.WEBSITE,
      st: B.CONFIRMED,
      pay: P.UNPAID,
    },
  ]
}

export function buildBookings(now) {
  const resourceById = new Map(resources.map((r) => [r.id, r]))
  return buildBookingSpecs(now).map((spec) => {
    const resource = resourceById.get(spec.res)
    const [start, end] = spec.when
    const branch = branches.find((b) => b.id === resource.branchId)
    const discounts = pricingRules.filter((r) => r.hubId === resource.hubId)
    const price = computePrice({
      hourlyRate: resource.hourlyRate,
      startAt: start,
      endAt: end,
      discounts,
    })
    const created = new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const n = String(spec.n)
    return {
      id: `bk_${n.padStart(3, '0')}`,
      reference: `GH-${n.padStart(5, '0')}`,
      hubId: hubs.find((h) => h.id === branch.hubId).id,
      branchId: branch.id,
      customerId: spec.cust,
      resourceId: spec.res,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      source: spec.src,
      status: spec.st,
      paymentStatus: spec.pay,
      priceBreakdown: price,
      totalPrice: price.total,
      notes: spec.notes ?? '',
      createdAt: created,
      updatedAt: created,
    }
  })
}
