import {
  Bell,
  CalendarCheck,
  Cpu,
  DollarSign,
  LayoutDashboard,
  Menu,
  Monitor,
  Settings,
  Tag,
  Timer,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn, DemoTag } from '../components/ui'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/stations', label: 'Live stations', icon: Monitor },
  { to: '/admin/sessions', label: 'Sessions', icon: Timer },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/admin/resources', label: 'Resources', icon: Cpu },
  { to: '/admin/pricing', label: 'Pricing', icon: Tag },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Admin" className="space-y-1 p-3">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
              isActive ? 'bg-elevated text-ink' : 'text-muted hover:bg-elevated hover:text-ink',
            )
          }
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:block">
        <div className="px-6 py-4 font-display text-lg font-bold">GameHub Admin</div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-60 bg-surface">
            <div className="flex items-center justify-between px-6 py-4 font-display text-lg font-bold">
              GameHub Admin
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Branch</span>
            <select className="rounded-lg border border-line bg-elevated px-2 py-1 text-sm">
              <option>Main branch (demo)</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3">
            <DemoTag>Demo admin</DemoTag>
            <button type="button" aria-label="Notifications (placeholder)" disabled>
              <Bell aria-hidden="true" className="size-5 text-muted" />
            </button>
            <Link to="/" className="text-sm text-muted hover:text-ink">
              Customer site
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
