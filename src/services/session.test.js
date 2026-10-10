import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { at, bookingInput, expectCode, setupDomain, teardownDomain } from '../test/helpers'
import { setClock } from '../utils/clock'
import { getAvailability } from './availabilityService'
import { createBooking, getBookingById } from './bookingService'
import { completeSession, extendSession, listSessions, startSession } from './sessionService'
import { store } from './store'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

describe('startSession', () => {
  it('starts a confirmed booking whose time has come', async () => {
    const session = await startSession('bk_003')
    expect(session.status).toBe('ACTIVE')
    expect(session.expectedEndAt).toBe(at('13:00').toISOString())
    expect(session.resource.id).toBe('res_kp_pc02')
    expect(session.customer.id).toBe('cust_003')
  })

  it('cannot be started twice', async () => {
    await startSession('bk_003')
    await expectCode(startSession('bk_003'), 'SESSION_ALREADY_ACTIVE')
  })

  it('rejects a booking that already has a running session', async () => {
    await expectCode(startSession('bk_001'), 'SESSION_ALREADY_ACTIVE')
  })

  it('rejects a station that already has a running session', async () => {
    // bk_002 is on PC-01, whose previous session (bk_001) has not been completed yet
    setClock(() => at('12:20'))
    await expectCode(startSession('bk_002'), 'SESSION_ALREADY_ACTIVE')
  })

  it('rejects starting too early', async () => {
    await expectCode(startSession('bk_013'), 'INVALID_STATUS_TRANSITION')
  })

  it('rejects non-confirmed bookings', async () => {
    await expectCode(startSession('bk_006'), 'INVALID_STATUS_TRANSITION') // cancelled
    await expectCode(startSession('bk_007'), 'INVALID_STATUS_TRANSITION') // completed
    await expectCode(startSession('bk_004'), 'INVALID_STATUS_TRANSITION') // pending
  })

  it('rejects a station under maintenance', async () => {
    // The service refuses maintenance while bookings stand, so force the state directly.
    store.update((s) => ({
      ...s,
      resources: s.resources.map((r) =>
        r.id === 'res_kp_pc02' ? { ...r, operationalStatus: 'MAINTENANCE' } : r,
      ),
    }))
    await expectCode(startSession('bk_003'), 'RESOURCE_UNDER_MAINTENANCE')
  })

  it('returns NOT_FOUND for an unknown booking', async () => {
    await expectCode(startSession('nope'), 'NOT_FOUND')
  })
})

describe('extendSession', () => {
  it('rejects an extension that overlaps the next confirmed booking', async () => {
    const err = await expectCode(extendSession('bk_001', 30), 'SESSION_EXTENSION_CONFLICT')
    expect(err.message).toContain('GH-00002')
    const session = (await listSessions({ status: 'ACTIVE' })).find((s) => s.bookingId === 'bk_001')
    expect(session.expectedEndAt).toBe(at('12:30').toISOString()) // unchanged
    expect(session.extensionCount).toBe(0)
  })

  it('extends when the station is free and updates booking end and price', async () => {
    const started = await startSession('bk_003') // PC-02 12:00-13:00, free afterwards
    const before = await getBookingById('bk_003')
    const session = await extendSession('bk_003', 60)
    expect(started.extensionCount).toBe(0)
    expect(session.extensionCount).toBe(1)
    expect(session.expectedEndAt).toBe(at('14:00').toISOString())
    const after = await getBookingById('bk_003')
    expect(after.endAt).toBe(at('14:00').toISOString())
    expect(after.totalPrice).toBeGreaterThan(before.totalPrice)
    expect(after.paymentStatus).toBe(before.paymentStatus)
  })

  it('blocks new bookings in the extended interval', async () => {
    await startSession('bk_003')
    await extendSession('bk_003', 60)
    const slots = (
      await getAvailability({
        hubId: 'hub_pixel',
        branchId: 'br_kp',
        date: '2026-10-12',
        durationMinutes: 60,
        resourceId: 'res_kp_pc02',
      })
    ).resources[0].slots
    expect(slots[0].startAt).toBe(at('14:00').toISOString())
  })

  it('rejects an extension past closing time', async () => {
    const late = await createBooking(
      bookingInput({
        source: 'ADMIN',
        resourceId: 'res_kp_pc04',
        startAt: at('21:00').toISOString(),
        endAt: at('22:00').toISOString(),
      }),
    )
    setClock(() => at('21:10'))
    await startSession(late.id)
    await extendSession(late.id, 60) // ends exactly at closing (23:00)
    await expectCode(extendSession(late.id, 30), 'OUTSIDE_OPERATING_HOURS')
  })

  it('rejects invalid minutes and non-running sessions', async () => {
    await expectCode(extendSession('bk_001', 0), 'INVALID_INPUT')
    await expectCode(extendSession('bk_001', 45), 'INVALID_INPUT')
    await expectCode(extendSession('bk_003', 30), 'INVALID_STATUS_TRANSITION') // not started
    await expectCode(extendSession('bk_007', 30), 'INVALID_STATUS_TRANSITION') // completed
  })
})

describe('completeSession', () => {
  it('records the real end, completes the booking, and leaves payment alone', async () => {
    const before = await getBookingById('bk_001')
    const session = await completeSession('bk_001')
    expect(session.status).toBe('COMPLETED')
    expect(session.actualEndAt).toBe(at('12:10').toISOString())
    const after = await getBookingById('bk_001')
    expect(after.status).toBe('COMPLETED')
    expect(after.paymentStatus).toBe(before.paymentStatus)
  })

  it('frees the rest of the slot when finishing early', async () => {
    const slot = {
      source: 'ADMIN',
      resourceId: 'res_kp_pc04',
      startAt: at('13:00').toISOString(),
      endAt: at('15:00').toISOString(),
    }
    const booked = await createBooking(bookingInput(slot))
    const later = bookingInput({
      resourceId: 'res_kp_pc04',
      startAt: at('14:00').toISOString(),
      endAt: at('14:30').toISOString(),
    })
    await expectCode(createBooking(later), 'BOOKING_CONFLICT')

    setClock(() => at('13:05'))
    await startSession(booked.id)
    setClock(() => at('13:40'))
    await completeSession(booked.id) // finishes 80 minutes early

    await expect(createBooking(later)).resolves.toBeTruthy()
  })

  it('cannot complete twice or complete a session that never started', async () => {
    await completeSession('bk_001')
    await expectCode(completeSession('bk_001'), 'INVALID_STATUS_TRANSITION')
    await expectCode(completeSession('bk_003'), 'INVALID_STATUS_TRANSITION')
  })
})

describe('listSessions', () => {
  it('lists active, completed and not-started sessions', async () => {
    expect((await listSessions({ status: 'ACTIVE' })).map((s) => s.bookingId)).toEqual(['bk_001'])
    expect((await listSessions({ status: 'COMPLETED' })).map((s) => s.bookingId)).toEqual([
      'bk_007',
      'bk_008',
    ])
    const upcoming = await listSessions({ status: 'NOT_STARTED' })
    expect(upcoming.every((s) => s.status === 'NOT_STARTED' && s.id === null)).toBe(true)
    expect(upcoming.map((s) => s.bookingId)).toContain('bk_003')
    expect(upcoming.map((s) => s.bookingId)).not.toContain('bk_006') // cancelled
  })

  it('scopes by hub', async () => {
    const nova = await listSessions({ hubId: 'hub_nova' })
    expect(nova.map((s) => s.bookingId)).toEqual(['bk_011'])
  })
})
