import { useEffect, useState, useSyncExternalStore } from 'react'
import { store } from '../services/store'

// Runs an async service call and re-runs it whenever shared state changes (so a booking made on
// the customer site shows up in admin views) or `deps` change.
// Returns { data, loading, error, refetch }. Previous data stays visible while reloading.
export function useServiceQuery(fn, deps = []) {
  const version = useSyncExternalStore(store.subscribe, store.getVersion)
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps])

  return { ...state, refetch: () => setTick((t) => t + 1) }
}
