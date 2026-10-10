import { useLocation } from 'react-router-dom'
import { ButtonLink, EmptyState } from '../../components/ui'

export default function NotFoundPage() {
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/admin')
  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState
        title="Page not found"
        description={`We couldn't find ${pathname}.`}
        action={
          <ButtonLink to={inAdmin ? '/admin' : '/'} variant="secondary">
            {inAdmin ? 'Back to dashboard' : 'Back to home'}
          </ButtonLink>
        }
      />
    </div>
  )
}
