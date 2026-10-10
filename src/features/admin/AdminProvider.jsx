import { useMemo, useState } from 'react'
import { useServiceQuery } from '../../hooks/useServiceQuery'
import { hubService } from '../../services'
import { AdminContext } from './adminContext'

const STORAGE_KEY = 'gaming-hub-demo-admin-scope'

function readScope() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function writeScope(scope) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scope))
  } catch {
    // Scope simply will not be remembered.
  }
}

// Holds the hub and branch the admin is currently working on. branchId '' means all branches.
export default function AdminProvider({ children }) {
  const [saved, setSaved] = useState(readScope)
  const hubsQuery = useServiceQuery(() => hubService.listHubs({ includeUnpublished: true }), [])
  const hubs = hubsQuery.data
  const hub = hubs?.find((h) => h.id === saved.hubId) ?? hubs?.[0]

  const branchesQuery = useServiceQuery(
    () => (hub ? hubService.listBranches(hub.id) : Promise.resolve([])),
    [hub?.id],
  )
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data])
  const branchId = branches.some((b) => b.id === saved.branchId) ? saved.branchId : ''

  const value = useMemo(() => {
    const update = (next) => {
      setSaved(next)
      writeScope(next)
    }
    return {
      hubs: hubs ?? [],
      hub,
      branches,
      branchId,
      scope: { hubId: hub?.id, branchId: branchId || undefined },
      ready: Boolean(hub),
      setHubId: (id) => update({ hubId: id, branchId: '' }),
      setBranchId: (id) => update({ hubId: hub?.id, branchId: id }),
    }
  }, [hubs, hub, branches, branchId])

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
