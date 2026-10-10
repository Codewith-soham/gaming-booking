import { TriangleAlert } from 'lucide-react'
import Button from './Button'

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-10 text-center"
    >
      <TriangleAlert aria-hidden="true" className="size-8 text-danger" />
      <h3 className="font-medium">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
