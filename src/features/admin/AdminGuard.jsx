import { Navigate, useLocation } from 'react-router-dom'
import { isAdminLoggedIn } from './adminSession'

// Navigation guard for the demo only. Client-side guards are not a security control.
export default function AdminGuard({ children }) {
  const location = useLocation()
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return children
}
