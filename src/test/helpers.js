import { buildSeed } from '../data/seed'
import { resetClock, setClock } from '../utils/clock'
import { store } from '../services/store'

// Monday 12 Oct 2026, 12:10 local. Seed anchor is therefore 12:00.
export const FIXED_NOW = new Date(2026, 9, 12, 12, 10, 0, 0)

export function setupDomain(now = FIXED_NOW) {
  localStorage.clear()
  setClock(() => new Date(now))
  store.reset(buildSeed(now))
}

export function teardownDomain() {
  resetClock()
  localStorage.clear()
}

// Local time on the FIXED_NOW date (offset in days) as a Date.
export function at(hhmm, dayOffset = 0) {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2026, 9, 12 + dayOffset, h, m, 0, 0)
}

export const STAFF = { role: 'STAFF' }
export const customerActor = (id) => ({ role: 'CUSTOMER', id })

// A valid website booking on a free station tomorrow unless overridden.
export function bookingInput(overrides = {}) {
  return {
    hubId: 'hub_pixel',
    branchId: 'br_kp',
    customerId: 'cust_001',
    resourceId: 'res_kp_pc03',
    startAt: at('14:00', 1).toISOString(),
    endAt: at('15:00', 1).toISOString(),
    source: 'WEBSITE',
    ...overrides,
  }
}

export async function expectCode(promise, code) {
  let error
  try {
    await promise
  } catch (e) {
    error = e
  }
  if (!error) throw new Error(`Expected rejection with ${code}, but it resolved.`)
  if (error.code !== code) throw new Error(`Expected ${code}, got ${error.code}: ${error.message}`)
  return error
}
