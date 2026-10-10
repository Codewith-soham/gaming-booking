import { buildSeed, STATE_VERSION } from '../data/seed'
import { now } from '../utils/clock'
import { toDateKey } from '../utils/time'

// The single source of truth for the prototype. Services read and write it; React subscribes to it.
// Persistence is localStorage behind this adapter and is prototype-only (untrusted, per-browser).
const STORAGE_KEY = 'gaming-hub-demo-state'

function createStore() {
  let state = null
  let version = 0
  const listeners = new Set()

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable or full: the demo keeps working in memory.
    }
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const fresh =
        parsed?.meta?.stateVersion === STATE_VERSION &&
        parsed.meta.seedDate === toDateKey(now()) &&
        Array.isArray(parsed.bookings)
      return fresh ? parsed : null
    } catch {
      return null
    }
  }

  function ensure() {
    if (!state) {
      state = loadPersisted() ?? buildSeed(now())
      persist()
    }
  }

  function notify() {
    version += 1
    listeners.forEach((listener) => listener())
  }

  return {
    getState() {
      ensure()
      return state
    },
    getVersion() {
      return version
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    // fn(state) must return a NEW state object (never mutate in place).
    update(fn) {
      ensure()
      state = fn(state)
      persist()
      notify()
    },
    // Restore the baseline demo data (or a provided state, used by tests).
    reset(seed) {
      state = seed ?? buildSeed(now())
      persist()
      notify()
    },
    // Allocates the next sequence number for an entity kind (ids and booking references).
    nextSeq(kind) {
      ensure()
      const next = (state.meta.counters[kind] ?? 0) + 1
      state = {
        ...state,
        meta: { ...state.meta, counters: { ...state.meta.counters, [kind]: next } },
      }
      persist()
      return next
    },
  }
}

export const store = createStore()
