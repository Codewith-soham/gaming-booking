import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectCode, setupDomain, STAFF, teardownDomain } from '../test/helpers'
import { cancelBooking } from './bookingService'
import {
  createResource,
  getResourceById,
  listAffectedBookings,
  listResources,
  setOperationalStatus,
  updateResource,
} from './resourceService'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

const newResource = (overrides = {}) => ({
  hubId: 'hub_pixel',
  branchId: 'br_kp',
  name: 'PC-07',
  type: 'PC',
  hourlyRate: 90,
  ...overrides,
})

describe('listResources', () => {
  it('filters by hub, branch, type and operational status', async () => {
    expect((await listResources({ hubId: 'hub_nova' })).length).toBe(8)
    expect((await listResources({ branchId: 'br_baner', type: 'RACING_SIMULATOR' })).length).toBe(1)
    expect((await listResources({ status: 'MAINTENANCE' })).map((r) => r.id)).toEqual([
      'res_kp_pc05',
    ])
  })
})

describe('createResource / updateResource', () => {
  it('creates an available, active resource with a new id', async () => {
    const created = await createResource(newResource())
    expect(created).toMatchObject({
      id: 'res_101',
      operationalStatus: 'AVAILABLE',
      isActive: true,
      hourlyRate: 90,
    })
    expect(await getResourceById('res_101')).toEqual(created)
  })

  it('validates required fields, rate, hub/branch match and duplicates', async () => {
    await expectCode(createResource(newResource({ name: '  ' })), 'INVALID_INPUT')
    await expectCode(createResource(newResource({ type: 'TOASTER' })), 'INVALID_INPUT')
    await expectCode(createResource(newResource({ hourlyRate: 0 })), 'INVALID_INPUT')
    await expectCode(createResource(newResource({ hourlyRate: 9.5 })), 'INVALID_INPUT')
    await expectCode(createResource(newResource({ branchId: 'br_nova' })), 'INVALID_INPUT')
    await expectCode(createResource(newResource({ branchId: 'nope' })), 'NOT_FOUND')
    await expectCode(createResource(newResource({ name: 'pc-01' })), 'INVALID_INPUT')
  })

  it('updates allowed fields and rejects others', async () => {
    const updated = await updateResource('res_kp_pc03', { name: 'PC-03 Pro', hourlyRate: 95 })
    expect(updated).toMatchObject({ name: 'PC-03 Pro', hourlyRate: 95 })
    await expectCode(updateResource('res_kp_pc03', { branchId: 'br_baner' }), 'INVALID_INPUT')
    await expectCode(updateResource('res_kp_pc03', { hourlyRate: -1 }), 'INVALID_INPUT')
    await expectCode(updateResource('nope', { name: 'x' }), 'NOT_FOUND')
  })

  it('refuses to deactivate a resource with upcoming bookings', async () => {
    await expectCode(updateResource('res_kp_pc01', { isActive: false }), 'BOOKING_CONFLICT')
    const free = await updateResource('res_kp_pc04', { isActive: false })
    expect(free.isActive).toBe(false)
    expect((await listResources({ branchId: 'br_kp' })).map((r) => r.id)).not.toContain(
      'res_kp_pc04',
    )
  })
})

describe('setOperationalStatus', () => {
  it('puts a free station into maintenance and back', async () => {
    expect((await setOperationalStatus('res_kp_pc04', 'MAINTENANCE')).operationalStatus).toBe(
      'MAINTENANCE',
    )
    expect((await setOperationalStatus('res_kp_pc04', 'AVAILABLE')).operationalStatus).toBe(
      'AVAILABLE',
    )
  })

  it('blocks maintenance while upcoming bookings exist and lists them', async () => {
    const err = await expectCode(
      setOperationalStatus('res_kp_pc01', 'MAINTENANCE'),
      'BOOKING_CONFLICT',
    )
    expect(err.details.references).toEqual(['GH-00001', 'GH-00002'])
    expect((await listAffectedBookings('res_kp_pc01')).map((b) => b.id).sort()).toEqual([
      'bk_001',
      'bk_002',
    ])
  })

  it('allows maintenance once the blocking bookings are cancelled', async () => {
    await cancelBooking('bk_005', STAFF)
    const updated = await setOperationalStatus('res_kp_xbox01', 'OFFLINE')
    expect(updated.operationalStatus).toBe('OFFLINE')
  })

  it('validates status and id', async () => {
    await expectCode(setOperationalStatus('res_kp_pc04', 'BROKEN'), 'INVALID_INPUT')
    await expectCode(setOperationalStatus('nope', 'AVAILABLE'), 'NOT_FOUND')
  })
})
