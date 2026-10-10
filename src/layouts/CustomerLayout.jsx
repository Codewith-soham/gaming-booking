import { Gamepad2 } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import CustomerMenu from '../components/booking/CustomerMenu'
import { cn } from '../components/ui'

const links = [
  { to: '/', label: 'Discover', end: true },
  { to: '/my-bookings', label: 'My bookings' },
]

export default function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <Gamepad2 aria-hidden="true" className="size-6 text-accent" />
            GameHub
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-elevated text-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <CustomerMenu />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
          <span>Help: contact your hub directly.</span>
          <span>Prototype with sample data. No real bookings or payments are made.</span>
        </div>
      </footer>
    </div>
  )
}
