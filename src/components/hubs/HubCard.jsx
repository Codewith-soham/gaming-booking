import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, typeLabel } from '../../utils/format'
import { Badge } from '../ui'
import HubImage from './HubImage'

export default function HubCard({ hub }) {
  const { summary } = hub
  return (
    <Link
      to={`/hubs/${hub.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent"
    >
      <HubImage
        src={hub.imageUrls[0]}
        alt={`${hub.name} gaming floor (demo image)`}
        className="aspect-[16/9] w-full"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold group-hover:text-accent">{hub.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin aria-hidden="true" className="size-3.5" />
            {hub.city}
            {summary.branchCount > 1 && ` - ${summary.branchCount} branches`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {summary.resourceTypes.map((t) => (
            <Badge key={t}>{typeLabel(t)}</Badge>
          ))}
        </div>

        <p className="text-sm text-muted">{hub.amenities.slice(0, 3).join(' - ')}</p>

        <div className="mt-auto flex items-end justify-between border-t border-line pt-3 text-sm">
          <span>
            From <strong className="tabular">{formatCurrency(summary.minHourlyRate)}</strong>/hr
          </span>
          <span className="text-right">
            <Badge tone={summary.availableNow > 0 ? 'ok' : 'danger'}>
              {summary.availableNow} of {summary.resourceCount} free now
            </Badge>
          </span>
        </div>
      </div>
    </Link>
  )
}
