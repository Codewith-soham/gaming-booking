import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSeed } from '../data/seed'
import {
  at,
  bookingInput,
  customerActor,
  expectCode,
  FIXED_NOW,
  setupDomain,
  STAFF,
  teardownDomain,
} from '../test/helpers'
import { getAvailability } from './availabilityService'
import {
  cancelBooking,
  createBooking,
  getBookingById,
  listBookings,
  updateBookingPaymentStatus,
} from './bookingService'
import { store } from './store'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

describe('createBooking', () => {
  it('creates a confirmed booking with reference, price and source', async () => {
    const booking = await createBooking(bookingInput())
    expect(booking.reference).toBe('GH-00014')
    expect(booking.status).toBe('CONFIRMED')
    expect(booking.paymentStatus).toBe('UNPAID')
    expect(booking.source).toBe('WEBSITE')
    expect(booking.totalPrice).toBe(80)
    expect(booking.resource.name).toBe('PC-03')
    expect(booking.customer.id).toBe('cust_001')
  })

  it('rejects overlapping bookings for the same resource', async () => {
    await createBooking(bookingInput())
    const err = await expectCode(
      createBooking(
        bookingInput({
          startAt: at('14:30', 1).toISOString(),
          endAt: at('15:30', 1).toISOString(),
        }),
      ),
      'BOOKING_CONFLICT',
    )
    expect(err.message).toMatch(/no longer available/)
  })

  it('allows adjacent bookings (one ends exactly when the next begins)', async () => {
    await createBooking(bookingInput())
    const next = await createBooking(
      bookingInput({ startAt: at('15:00', 1).toISOString(), endAt: at('16:00', 1).toISOString() }),
    )
    expect(next.status).toBe('CONFIRMED')
  })

  it('allows overlapping times on different resources', async () => {
    await createBooking(bookingInput())
    const other = await createBooking(bookingInput({ resourceId: 'res_kp_pc04' }))
    expect(other.resourceId).toBe('res_kp_pc04')
  })

  it('does not let cancelled bookings block the interval', async () => {
    const first = await createBooking(bookingInput())
    await cancelBooking(first.id, STAFF)
    await expect(createBooking(bookingInput())).resolves.toBeTruthy()
  })

  it('rejects end <= start', async () => {
    await expectCode(
      createBooking(bookingInput({ endAt: at('14:00', 1).toISOString() })),
      'INVALID_TIME_RANGE',
    )
    await expectCode(
      createBooking(
        bookingInput({
          startAt: at('15:00', 1).toISOString(),
          endAt: at('14:00', 1).toISOString(),
        }),
      ),
      'INVALID_TIME_RANGE',
    )
  })

  it('rejects durations outside the allowed range or step', async () => {
    await expectCode(
      createBooking(bookingInput({ endAt: at('14:15', 1).toISOString() })),
      'INVALID_TIME_RANGE',
    )
    await expectCode(
      createBooking(bookingInput({ endAt: at('20:00', 1).toISOString() })),
      'INVALID_TIME_RANGE',
    )
  })

  it('rejects bookings outside opening hours', async () => {
    await expectCode(
      createBooking(
        bookingInput({
          startAt: at('08:00', 1).toISOString(),
          endAt: at('09:00', 1).toISOString(),
        }),
      ),
      'OUTSIDE_OPERATING_HOURS',
    )
    await expectCode(
      createBooking(
        bookingInput({
          startAt: at('22:30', 1).toISOString(),
          endAt: at('23:30', 1).toISOString(),
        }),
      ),
      'OUTSIDE_OPERATING_HOURS',
    )
  })

  it('rejects bookings on a closed day', async () => {
    const seed = buildSeed(FIXED_NOW)
    seed.branches = seed.branches.map((b) =>
      b.id === 'br_kp' ? { ...b, openingHours: { ...b.openingHours, 2: null } } : b,
    )
    store.reset(seed)
    await expectCode(createBooking(bookingInput()), 'OUTSIDE_OPERATING_HOURS')
  })

  it('rejects past starts for customers, but tolerates a recent start for staff', async () => {
    const past = { startAt: at('11:00').toISOString(), endAt: at('12:00').toISOString() }
    await expectCode(createBooking(bookingInput(past)), 'INVALID_TIME_RANGE')

    const walkIn = {
      source: 'ADMIN',
      resourceId: 'res_kp_pc04',
      startAt: at('11:50').toISOString(),
      endAt: at('12:50').toISOString(),
    }
    const booking = await createBooking(bookingInput(walkIn))
    expect(booking.source).toBe('ADMIN')
  })

  it('rejects a station under maintenance or offline', async () => {
    await expectCode(
      createBooking(bookingInput({ resourceId: 'res_kp_pc05' })),
      'RESOURCE_UNDER_MAINTENANCE',
    )
    await expectCode(
      createBooking(bookingInput({ resourceId: 'res_kp_pc06' })),
      'RESOURCE_UNAVAILABLE',
    )
  })

  it('rejects a resource from another hub or branch', async () => {
    await expectCode(createBooking(bookingInput({ resourceId: 'res_nova_pc01' })), 'INVALID_INPUT')
    await expectCode(createBooking(bookingInput({ resourceId: 'res_baner_pc01' })), 'INVALID_INPUT')
  })

  it('requires a branch when the hub has several', async () => {
    await expectCode(createBooking(bookingInput({ branchId: undefined })), 'INVALID_INPUT')
  })

  it('uses the single branch implicitly', async () => {
    const booking = await createBooking(
      bookingInput({
        hubId: 'hub_nova',
        branchId: undefined,
        resourceId: 'res_nova_pc02',
        startAt: at('15:00', 1).toISOString(),
        endAt: at('16:00', 1).toISOString(),
      }),
    )
    expect(booking.branchId).toBe('br_nova')
  })

  it('returns NOT_FOUND for unknown ids', async () => {
    await expectCode(createBooking(bookingInput({ hubId: 'nope' })), 'NOT_FOUND')
    await expectCode(createBooking(bookingInput({ customerId: 'nope' })), 'NOT_FOUND')
    await expectCode(createBooking(bookingInput({ resourceId: 'nope' })), 'NOT_FOUND')
    await expectCode(getBookingById('nope'), 'NOT_FOUND')
  })

  it('rejects an invalid source and payment status', async () => {
    await expectCode(createBooking(bookingInput({ source: 'FAX' })), 'INVALID_INPUT')
    await expectCode(createBooking(bookingInput({ paymentStatus: 'REFUNDED' })), 'INVALID_INPUT')
  })

  it('applies the long-session discount through the single pricing function', async () => {
    const booking = await createBooking(
      bookingInput({ startAt: at('11:00', 1).toISOString(), endAt: at('14:00', 1).toISOString() }),
    )
    expect(booking.priceBreakdown.baseAmount).toBe(240)
    expect(booking.priceBreakdown.discount.amount).toBe(24)
    expect(booking.totalPrice).toBe(216)
  })

  it('stops showing the slot in availability after booking', async () => {
    const query = {
      hubId: 'hub_pixel',
      branchId: 'br_kp',
      date: '2026-10-13',
      durationMinutes: 60,
      resourceId: 'res_kp_pc03',
    }
    const before = await getAvailability(query)
    await createBooking(bookingInput())
    const after = await getAvailability(query)
    const start = at('14:00', 1).toISOString()
    expect(before.resources[0].slots.some((s) => s.startAt === start)).toBe(true)
    expect(after.resources[0].slots.some((s) => s.startAt === start)).toBe(false)
  })
})

describe('cancelBooking', () => {
  it('lets staff cancel and keeps payment status untouched', async () => {
    const paid = await updateBookingPaymentStatus('bk_005', 'PAID')
    const cancelled = await cancelBooking('bk_005', STAFF)
    expect(cancelled.status).toBe('CANCELLED')
    expect(cancelled.paymentStatus).toBe(paid.paymentStatus)
  })

  it('lets a customer cancel their own booking before the cutoff', async () => {
    const cancelled = await cancelBooking('bk_005', customerActor('cust_005'))
    expect(cancelled.status).toBe('CANCELLED')
  })

  it("rejects cancelling someone else's booking", async () => {
    await expectCode(cancelBooking('bk_005', customerActor('cust_001')), 'BOOKING_NOT_CANCELLABLE')
  })

  it('rejects customers inside the cutoff window, but allows staff', async () => {
    await expectCode(cancelBooking('bk_002', customerActor('cust_002')), 'BOOKING_NOT_CANCELLABLE')
    const cancelled = await cancelBooking('bk_002', STAFF)
    expect(cancelled.status).toBe('CANCELLED')
  })

  it('rejects started, finished or already cancelled bookings', async () => {
    await expectCode(cancelBooking('bk_001', STAFF), 'BOOKING_NOT_CANCELLABLE') // active session
    await expectCode(cancelBooking('bk_007', STAFF), 'BOOKING_NOT_CANCELLABLE') // completed
    await expectCode(cancelBooking('bk_006', STAFF), 'BOOKING_NOT_CANCELLABLE') // cancelled
    await expectCode(cancelBooking('bk_003', STAFF), 'BOOKING_NOT_CANCELLABLE') // already started
  })

  it('returns NOT_FOUND for an unknown booking', async () => {
    await expectCode(cancelBooking('nope', STAFF), 'NOT_FOUND')
  })
})

describe('updateBookingPaymentStatus', () => {
  it('changes payment status without changing booking status', async () => {
    const before = await getBookingById('bk_002')
    const after = await updateBookingPaymentStatus('bk_002', 'PAID')
    expect(after.paymentStatus).toBe('PAID')
    expect(after.status).toBe(before.status)
  })

  it('only allows REFUNDED from PAID', async () => {
    await expectCode(updateBookingPaymentStatus('bk_002', 'REFUNDED'), 'INVALID_STATUS_TRANSITION')
    await expect(updateBookingPaymentStatus('bk_006', 'REFUNDED')).resolves.toMatchObject({
      paymentStatus: 'REFUNDED',
      status: 'CANCELLED',
    })
  })

  it('rejects unknown statuses', async () => {
    await expectCode(updateBookingPaymentStatus('bk_002', 'MAYBE'), 'INVALID_INPUT')
  })
})

describe('listBookings', () => {
  it('filters by status, source, payment status and search text', async () => {
    expect((await listBookings({ status: 'CANCELLED' })).map((b) => b.id).sort()).toEqual([
      'bk_006',
      'bk_010',
    ])
    expect((await listBookings({ source: 'WHATSAPP' })).length).toBe(2)
    expect((await listBookings({ paymentStatus: ['PENDING'] })).map((b) => b.id)).toEqual([
      'bk_004',
    ])
    expect((await listBookings({ query: 'gh-00005' })).map((b) => b.id)).toEqual(['bk_005'])
    expect(
      (await listBookings({ query: 'diya' })).every((b) => b.customer.name === 'Diya Nair'),
    ).toBe(true)
  })

  it('filters by hub, branch and day', async () => {
    const nova = await listBookings({ hubId: 'hub_nova' })
    expect(nova.map((b) => b.id)).toEqual(['bk_011'])
    const tomorrow = await listBookings({ date: '2026-10-13', branchId: 'br_kp' })
    expect(tomorrow.map((b) => b.id).sort()).toEqual(['bk_004', 'bk_005'])
  })

  it('returns copies that cannot mutate shared state', async () => {
    const [first] = await listBookings()
    first.status = 'CANCELLED'
    const again = await getBookingById(first.id)
    expect(again.status).not.toBe('CANCELLED')
  })
})
