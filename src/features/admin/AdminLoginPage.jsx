import { ShieldAlert } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, DemoTag } from '../../components/ui'
import { loginAdmin } from './adminSession'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/admin'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <DemoTag>Prototype only</DemoTag>
          <h1 className="font-display text-2xl font-bold">GameHub Admin</h1>
        </div>
        <div className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            This is a demo sign-in. There are no accounts or passwords, and nothing is protected. A
            real login comes with the backend.
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            loginAdmin()
            navigate(from, { replace: true })
          }}
        >
          Continue as demo staff
        </Button>
        <Link to="/" className="block text-center text-sm text-muted hover:text-ink">
          Back to customer site
        </Link>
      </Card>
    </div>
  )
}
