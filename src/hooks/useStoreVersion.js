import { useSyncExternalStore } from 'react'
import { store } from '../services/store'

// Re-renders the caller whenever shared demo state changes.
export function useStoreVersion() {
  return useSyncExternalStore(store.subscribe, store.getVersion)
}
