import { createContext, useContext } from 'react'

export const AdminContext = createContext(null)

// { hubs, hub, branches, branchId, scope: { hubId, branchId }, setHubId, setBranchId, loading }
export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
