import { formatCurrency, formatTime, typeLabel } from '../../utils/format'
import { Badge, cn } from '../ui'

// availability: result of availabilityService.getAvailability. One row per bookable station.
export default function SlotPicker({ availability, selection, onSelect }) {
  const rows = availability.resources
  const withSlots = rows.filter((r) => r.slots.length)

  if (availability.closed) {
    return <p className="text-sm text-muted">The hub is closed on this day. Try another date.</p>
  }
  if (!withSlots.length) {
    return (
      <p className="text-sm text-muted">
        No station has a free time for this date and length. Try another date, a shorter session or
        a different station type.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map(({ resource, slots }) => (
        <fieldset key={resource.id} className="rounded-lg border border-line p-4">
          <legend className="px-2 text-sm font-medium">
            {resource.name} <span className="text-muted">- {typeLabel(resource.type)}</span>{' '}
            <span className="tabular text-muted">{formatCurrency(resource.hourlyRate)}/hr</span>
          </legend>
          {slots.length === 0 ? (
            <Badge tone="danger">Fully booked</Badge>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const picked =
                  selection?.resourceId === resource.id && selection.startAt === slot.startAt
                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    aria-pressed={picked}
                    aria-label={`${resource.name} at ${formatTime(slot.startAt)}`}
                    onClick={() =>
                      onSelect({
                        resourceId: resource.id,
                        resource,
                        startAt: slot.startAt,
                        endAt: slot.endAt,
                      })
                    }
                    className={cn(
                      'tabular rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      picked
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line bg-surface hover:border-accent',
                    )}
                  >
                    {formatTime(slot.startAt)}
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>
      ))}
      {availability.excluded.length > 0 && (
        <p className="text-xs text-muted">
          {availability.excluded.length} station(s) are not bookable right now (maintenance or
          offline).
        </p>
      )}
    </div>
  )
}
