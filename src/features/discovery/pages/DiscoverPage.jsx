import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import HubCard from '../../../components/hubs/HubCard'
import HubFilters, { EMPTY_FILTERS } from '../../../components/hubs/HubFilters'
import { Button, DemoTag, EmptyState, ErrorState, Skeleton } from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { hubService } from '../../../services'

const KEYS = Object.keys(EMPTY_FILTERS)

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])),
    [params],
  )

  const setFilters = (next) => {
    const out = new URLSearchParams()
    for (const k of KEYS) if (next[k]) out.set(k, next[k])
    setParams(out, { replace: true })
  }

  // The unfiltered list feeds the filter options; the filtered list feeds the cards.
  const all = useServiceQuery(() => hubService.listHubs(), [])
  const result = useServiceQuery(
    () =>
      hubService.listHubs({
        query: filters.query,
        city: filters.city,
        resourceType: filters.type,
        amenity: filters.amenity,
        maxHourlyRate: filters.maxRate ? Number(filters.maxRate) : undefined,
      }),
    [filters.query, filters.city, filters.type, filters.amenity, filters.maxRate],
  )

  const cities = useMemo(() => [...new Set((all.data ?? []).map((h) => h.city))].sort(), [all.data])
  const amenities = useMemo(
    () => [...new Set((all.data ?? []).flatMap((h) => h.amenities))].sort(),
    [all.data],
  )
  const hubs = result.data
  const filtering = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-8">
      <section className="space-y-3 py-4">
        <DemoTag>Prototype - sample hubs</DemoTag>
        <h1 className="font-display text-3xl font-bold sm:text-5xl">
          Find a gaming hub.
          <br />
          <span className="text-accent">Book your station.</span>
        </h1>
        <p className="max-w-xl text-muted">
          Browse hubs, check which stations are free, and reserve a time. All hubs, prices and
          bookings here are sample data.
        </p>
      </section>

      <HubFilters filters={filters} onChange={setFilters} cities={cities} amenities={amenities} />

      <section aria-labelledby="hubs-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="hubs-heading" className="font-display text-xl font-semibold">
            {filtering ? 'Matching hubs' : 'Featured hubs'}
          </h2>
          {hubs && (
            <p role="status" className="text-sm text-muted">
              {hubs.length} {hubs.length === 1 ? 'hub' : 'hubs'}
            </p>
          )}
        </div>

        {result.error ? (
          <ErrorState
            message="Hubs could not be loaded. Please try again."
            onRetry={result.refetch}
          />
        ) : !hubs ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : hubs.length === 0 ? (
          <EmptyState
            title="No hubs match your search"
            description="Try a different city or station type, or remove a filter."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map((hub) => (
              <HubCard key={hub.id} hub={hub} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
