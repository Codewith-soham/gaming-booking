import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import StationStateBadge, { StationLegend } from '../../../components/stations/StationStateBadge'
import {
  Button,
  Card,
  DemoTag,
  Dialog,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  cn,
  useToast,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { resourceService } from '../../../services'
import { OperationalStatus, ResourceType, StationState } from '../../../utils/constants'
import { isServiceError } from '../../../utils/errors'
import { formatCurrency, formatDateTimeRange, typeLabel } from '../../../utils/format'
import { STATION_STATE_LABELS } from '../../../utils/stationStatus'
import { useAdmin } from '../../admin/adminContext'

// What each action does, what it asks, and the status it applies.
const ACTIONS = {
  maintenance: {
    status: OperationalStatus.MAINTENANCE,
    button: 'Mark maintenance',
    title: 'Mark as under maintenance?',
    text: 'The station will not be offered for new bookings.',
    success: 'marked under maintenance.',
    destructive: true,
  },
  offline: {
    status: OperationalStatus.OFFLINE,
    button: 'Mark offline',
    title: 'Mark as offline?',
    text: 'The station will not be offered for new bookings.',
    success: 'marked offline.',
    destructive: true,
  },
  restore: {
    status: OperationalStatus.AVAILABLE,
    button: 'Restore to available',
    title: 'Restore this station?',
    text: 'It can be booked again, subject to existing reservations.',
    success: 'restored.',
    destructive: false,
  },
}

export default function StationsPage() {
  const { scope, branches } = useAdmin()
  const toast = useToast()
  const [type, setType] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [pending, setPending] = useState(null) // key of ACTIONS
  const [blocked, setBlocked] = useState(null) // { message, bookings }
  const [busy, setBusy] = useState(false)

  const query = useServiceQuery(
    () => resourceService.listStationStates({ ...scope, type: type || undefined }),
    [scope.hubId, scope.branchId, type],
  )
  const all = query.data
  const stations = all?.filter((s) => !stateFilter || s.state === stateFilter)
  const selected = all?.find((s) => s.id === selectedId)
  const branchName = (id) => branches.find((b) => b.id === id)?.name

  function open(action) {
    setBlocked(null)
    setPending(action)
  }

  async function apply() {
    setBusy(true)
    try {
      await resourceService.setOperationalStatus(selected.id, ACTIONS[pending].status)
      toast.success(`${selected.name} ${ACTIONS[pending].success}`)
      setPending(null)
    } catch (err) {
      if (isServiceError(err) && err.code === 'BOOKING_CONFLICT') {
        // Existing bookings are never silently dropped: show them and keep the dialog open.
        const { bookingIds = [], references = [] } = err.details ?? {}
        setBlocked({
          message: err.message,
          items: bookingIds.map((id, i) => ({ id, reference: references[i] ?? id })),
        })
      } else {
        toast.error(isServiceError(err) ? err.message : 'The status could not be changed.')
        setPending(null)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Live stations"
        description="Status is worked out from bookings, sessions and the operational status staff set. It is not read from hardware."
        actions={<DemoTag>Simulated status</DemoTag>}
      />

      <Card className="mb-4">
        <StationLegend />
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <Select label="Station type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any type</option>
          {Object.values(ResourceType).map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </Select>
        <Select label="Status" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">Any status</option>
          {Object.values(StationState).map((s) => (
            <option key={s} value={s}>
              {STATION_STATE_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {query.error ? (
        <ErrorState message="Stations could not be loaded." onRetry={query.refetch} />
      ) : !stations ? (
        <Skeleton className="h-64 w-full" />
      ) : stations.length === 0 ? (
        <EmptyState title="No stations match" description="Change the filters above." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
            {stations.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === selectedId}
                  aria-label={`${s.name} - ${STATION_STATE_LABELS[s.state]}`}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'w-full space-y-2 rounded-xl border bg-surface p-4 text-left transition-colors hover:border-accent',
                    s.id === selectedId ? 'border-accent' : 'border-line',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    <StationStateBadge state={s.state} />
                  </div>
                  <p className="text-xs text-muted">
                    {typeLabel(s.type)}
                    {!scope.branchId && ` - ${branchName(s.branchId) ?? ''}`}
                  </p>
                  {s.currentBooking && (
                    <p className="text-xs">Now: {s.currentBooking.customer.name}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <aside aria-label="Station details">
            {!selected ? (
              <Card className="text-sm text-muted">
                Select a station to see details and actions.
              </Card>
            ) : (
              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{selected.name}</h2>
                  <StationStateBadge state={selected.state} />
                </div>
                <dl className="space-y-2 text-sm">
                  <Row label="Type">{typeLabel(selected.type)}</Row>
                  <Row label="Branch">{branchName(selected.branchId)}</Row>
                  <Row label="Rate">
                    <span className="tabular">{formatCurrency(selected.hourlyRate)}/hr</span>
                  </Row>
                  {selected.specifications && <Row label="Specs">{selected.specifications}</Row>}
                  <Row label="Current">
                    {selected.currentBooking ? (
                      <BookingLink booking={selected.currentBooking} />
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </Row>
                  <Row label="Next">
                    {selected.nextBooking ? (
                      <BookingLink booking={selected.nextBooking} />
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </Row>
                </dl>

                <div className="flex flex-wrap gap-2">
                  {selected.operationalStatus === OperationalStatus.AVAILABLE ? (
                    <>
                      <Button variant="secondary" onClick={() => open('maintenance')}>
                        {ACTIONS.maintenance.button}
                      </Button>
                      <Button variant="secondary" onClick={() => open('offline')}>
                        {ACTIONS.offline.button}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => open('restore')}>{ACTIONS.restore.button}</Button>
                  )}
                </div>
              </Card>
            )}
          </aside>
        </div>
      )}

      <Dialog
        open={Boolean(pending)}
        destructive={pending ? ACTIONS[pending].destructive : false}
        title={pending ? ACTIONS[pending].title : ''}
        description={pending ? `${selected?.name}: ${ACTIONS[pending].text}` : ''}
        confirmLabel={busy ? 'Working...' : pending ? ACTIONS[pending].button : 'Confirm'}
        onConfirm={apply}
        onCancel={() => setPending(null)}
      >
        {blocked && (
          <div
            role="alert"
            className="space-y-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm"
          >
            <p>{blocked.message}</p>
            <ul className="list-inside list-disc">
              {blocked.items.map((item) => (
                <li key={item.id}>
                  <Link to={`/admin/bookings/${item.id}`} className="text-accent hover:underline">
                    Open booking {item.reference}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function BookingLink({ booking }) {
  return (
    <Link to={`/admin/bookings/${booking.id}`} className="text-accent hover:underline">
      {booking.customer.name}
      <span className="tabular block text-xs text-muted">
        {formatDateTimeRange(booking.startAt, booking.endAt)}
      </span>
    </Link>
  )
}
