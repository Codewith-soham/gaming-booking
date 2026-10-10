import { Search } from 'lucide-react'
import { ResourceType } from '../../utils/constants'
import { typeLabel } from '../../utils/format'
import { Button, Input, Select } from '../ui'

export const EMPTY_FILTERS = { query: '', city: '', type: '', amenity: '', maxRate: '' }

const PRICE_CAPS = [80, 100, 150, 300]

// Controlled by the caller (state lives in the URL so filters survive navigation).
export default function HubFilters({ filters, onChange, cities, amenities }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })
  const active = Object.values(filters).some(Boolean)

  return (
    <form
      role="search"
      aria-label="Filter hubs"
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4 rounded-xl border border-line bg-surface p-4"
    >
      <div className="relative">
        <Input
          type="search"
          label="Search by hub name, city or area"
          helper="Demo: matches text only. Nearby search with real location is not connected."
          placeholder="e.g. Pune, Bandra, Pixel Arena"
          value={filters.query}
          onChange={set('query')}
          className="pl-9"
        />
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-[2.15rem] size-4 text-muted"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="City" value={filters.city} onChange={set('city')}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select label="Station type" value={filters.type} onChange={set('type')}>
          <option value="">Any type</option>
          {Object.values(ResourceType).map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </Select>
        <Select label="Amenity" value={filters.amenity} onChange={set('amenity')}>
          <option value="">Any amenity</option>
          {amenities.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select label="Starting price" value={filters.maxRate} onChange={set('maxRate')}>
          <option value="">Any price</option>
          {PRICE_CAPS.map((p) => (
            <option key={p} value={p}>
              Up to Rs {p}/hr
            </option>
          ))}
        </Select>
      </div>

      {active && (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </form>
  )
}
