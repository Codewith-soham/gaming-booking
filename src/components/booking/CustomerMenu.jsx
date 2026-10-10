import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useServiceQuery } from '../../hooks/useServiceQuery'
import { logoutAdmin } from '../../features/admin/adminSession'
import { customerService } from '../../services'
import { DemoTag } from '../ui'

// Demo identity menu. There are no customer accounts, so "Log out" ends the demo session and goes
// to the demo sign-in page (which also leads into the admin panel).
export default function CustomerMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const customer = useServiceQuery(() => customerService.getCurrentCustomer(), []).data

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-elevated"
      >
        <DemoTag>Demo customer</DemoTag>
        {customer && <span className="hidden sm:inline">{customer.name}</span>}
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-30 mt-2 w-56 space-y-1 rounded-xl border border-line bg-elevated p-2 shadow-lg"
        >
          <Link
            role="menuitem"
            to="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            Open admin panel
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logoutAdmin()
              navigate('/admin/login')
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
