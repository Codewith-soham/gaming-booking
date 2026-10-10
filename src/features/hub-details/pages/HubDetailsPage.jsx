import { Clock, MapPin, Phone } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import HubImage from '../../../components/hubs/HubImage'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  ButtonLink,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { hubService, pricingService } from '../../../services'
import { resolveOpeningHours } from '../../../utils/hours'
import { formatCurrency, summarizeOpeningHours, typeLabel } from '../../../utils/format'

// One row per resource type with how many stations and the rate range.
function groupByType(rates) {
  const groups = new Map()
  for (const r of rates) {
    const g = groups.get(r.type) ?? { type: r.type, count: 0, min: Infinity, max: 0 }
    g.count += 1
    g.min = Math.min(g.min, r.hourlyRate)
    g.max = Math.max(g.max, r.hourlyRate)
    groups.set(r.type, g)
  }
  return [...groups.values()]
}

function HubDetailsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function HubDetailsPage() {
  const { hubSlug } = useParams()
  const [params, setParams] = useSearchParams()

  const hubQuery = useServiceQuery(() => hubService.getHubBySlug(hubSlug), [hubSlug])
  const hub = hubQuery.data
  const branchesQuery = useServiceQuery(
    () => (hub ? hubService.listBranches(hub.id) : Promise.resolve([])),
    [hub?.id],
  )
  const branches = branchesQuery.data ?? []

  const requested = params.get('branch')
  const branch = branches.find((b) => b.id === requested) ?? branches[0]

  const pricingQuery = useServiceQuery(
    () =>
      hub && branch ? pricingService.getPricingForHub(hub.id, branch.id) : Promise.resolve(null),
    [hub?.id, branch?.id],
  )

  if (hubQuery.error?.code === 'NOT_FOUND') {
    return (
      <EmptyState
        title="Hub not found"
        description="This hub doesn't exist or is no longer listed."
        action={
          <ButtonLink to="/" variant="secondary">
            Browse hubs
          </ButtonLink>
        }
      />
    )
  }
  if (hubQuery.error) {
    return <ErrorState message="This hub could not be loaded." onRetry={hubQuery.refetch} />
  }
  if (!hub || !branch) return <HubDetailsSkeleton />

  const pricing = pricingQuery.data
  const groups = pricing ? groupByType(pricing.rates) : []
  const hours = summarizeOpeningHours(resolveOpeningHours(hub, branch))
  const bookHref = `/book/${hub.id}?branch=${branch.id}`

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/" className="hover:text-ink">
          Discover
        </Link>{' '}
        / <span className="text-ink">{hub.name}</span>
      </nav>

      <HubImage
        src={hub.imageUrls[0]}
        alt={`${hub.name} gaming floor (demo image)`}
        className="h-56 w-full rounded-xl sm:h-80"
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">{hub.name}</h1>
          <p className="flex items-center gap-1.5 text-muted">
            <MapPin aria-hidden="true" className="size-4" />
            {branch.address}, {hub.city}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Phone aria-hidden="true" className="size-4" />
            {hub.phone} (demo number)
          </p>
        </div>
        <ButtonLink to={bookHref} className="px-6 py-3 text-base">
          Book now
        </ButtonLink>
      </div>

      <p className="max-w-2xl text-muted">{hub.description}</p>

      {branches.length > 1 && (
        <div className="max-w-xs">
          <Select
            label="Branch"
            value={branch.id}
            onChange={(e) => setParams({ branch: e.target.value }, { replace: true })}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-xl font-semibold">Stations and prices</h2>
          <p className="mb-4 text-sm text-muted">
            Sample hourly rates for {branch.name}. Final price is shown before you confirm.
          </p>
          {!pricing ? (
            <Skeleton className="h-24 w-full" />
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted">No stations are listed for this branch yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {groups.map((g) => (
                <li key={g.type} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{typeLabel(g.type)}</p>
                    <p className="text-sm text-muted">
                      {g.count} {g.count === 1 ? 'station' : 'stations'}
                    </p>
                  </div>
                  <p className="tabular font-medium">
                    {g.min === g.max
                      ? formatCurrency(g.min)
                      : `${formatCurrency(g.min)} - ${formatCurrency(g.max)}`}
                    <span className="text-sm font-normal text-muted"> /hr</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          {pricing?.discounts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {pricing.discounts.map((d) => (
                <Badge key={d.id} tone="accent">
                  {d.label}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <Clock aria-hidden="true" className="size-5" />
              Opening hours
            </h2>
            <dl className="space-y-1.5 text-sm">
              {hours.map((row) => (
                <div key={row.days} className="flex justify-between gap-3">
                  <dt className="text-muted">{row.days}</dt>
                  <dd className="tabular">{row.hours}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-xl font-semibold">Amenities</h2>
            <ul className="flex flex-wrap gap-2">
              {hub.amenities.map((a) => (
                <li key={a}>
                  <Badge>{a}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex justify-center">
        <ButtonLink to={bookHref} className="px-8 py-3 text-base">
          Book at {branch.name}
        </ButtonLink>
      </div>
    </div>
  )
}
