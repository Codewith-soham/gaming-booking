import { now } from '../utils/clock'
import { store } from './store'

// Restores the baseline demo data (settings page "Reset demo data").
export async function resetDemoData() {
  store.reset()
  return { resetAt: now().toISOString() }
}
