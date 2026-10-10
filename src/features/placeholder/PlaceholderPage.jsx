import { Link } from 'react-router-dom'
import { Card, DemoTag } from '../../components/ui'

// Temporary page body used until the owning milestone implements the route.
export default function PlaceholderPage({
  title,
  description,
  milestone,
  backTo = '/',
  backLabel,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <DemoTag>Placeholder - {milestone}</DemoTag>
      </div>
      <Card>
        <p className="text-sm text-muted">{description}</p>
        <Link to={backTo} className="mt-4 inline-block text-sm text-accent hover:underline">
          {backLabel ?? 'Back to home'}
        </Link>
      </Card>
    </div>
  )
}
