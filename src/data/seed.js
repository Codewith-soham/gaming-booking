import { toDateKey } from '../utils/time'
import { buildBookings } from './bookings'
import { buildCustomers } from './customers'
import { branches, hubs, pricingRules } from './hubs'
import { resources } from './resources'
import { buildSessions } from './sessions'

// Bump when the persisted state shape changes so stale browser data is discarded.
export const STATE_VERSION = 1

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function buildSeed(now) {
  return {
    hubs: clone(hubs),
    branches: clone(branches),
    resources: clone(resources),
    pricingRules: clone(pricingRules),
    customers: buildCustomers(now),
    bookings: buildBookings(now),
    sessions: buildSessions(now),
    meta: {
      stateVersion: STATE_VERSION,
      // Seed times are relative to this day; a new day re-bases the demo data.
      seedDate: toDateKey(now),
      currentCustomerId: 'cust_001',
      // Counters for new entities. Resources start at 100 to avoid clashing with named seed ids.
      counters: { booking: 13, session: 3, customer: 8, resource: 100 },
    },
  }
}
