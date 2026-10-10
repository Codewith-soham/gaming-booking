import { CalendarPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import SourceBadge, { SOURCE_OPTIONS } from '../../../components/booking/SourceBadge'
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/booking/StatusBadges'
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Table,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { bookingService } from '../../../services'
import { BookingStatus, PaymentStatus } from '../../../utils/constants'
import { formatCurrency, formatDateTimeRange } from '../../../utils/format'
import { useAdmin } from '../../admin/adminContext'

const KEYS = ['query', 'date', 'status', 'source', 'payment']

const title = (v) => v.charAt(0) + v.slice(1).toLowerCase().replace('_', '-')

export default function AdminBookingsPage() {
  const { scope } = useAdmin()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])),
    [params],
  )
  const setFilter = (key) => (e) => {
    const next = new URLSearchParams(params)
    if (e.target.value) next.set(key, e.target.value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const filtering = Object.values(filters).some(Boolean)

  const query = useServiceQuery(
    () =>
      bookingService.listBookings({
        ...scope,
        query: filters.query,
        date: filters.date || undefined,
        status: filters.status || undefined,
        source: filters.source || undefined,
        paymentStatus: filters.payment || undefined,
      }),
    [scope.hubId, scope.branchId, ...KEYS.map((k) => filters[k])],
  )

  const columns = [
    {
      key: 'reference',
      header: 'Reference',
      render: (b) => (
        <Link
          to={`/admin/bookings/${b.id}`}
          className="tabular font-medium text-accent hover:underline"
        >
          {b.reference}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', render: (b) => b.customer.name },
    { key: 'resource', header: 'Station', render: (b) => b.resource.name },
    {
      key: 'when',
      header: 'When',
      className: 'tabular whitespace-nowrap',
      render: (b) => formatDateTimeRange(b.startAt, b.endAt),
    },
    { key: 'source', header: 'Source', render: (b) => <SourceBadge source={b.source} /> },
    {
      key: 'status',
      header: 'Booking',
      render: (b) => <BookingStatusBadge status={b.status} />,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (b) => <PaymentStatusBadge status={b.paymentStatus} />,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'tabular text-right',
      render: (b) => formatCurrency(b.totalPrice),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Online and walk-in bookings share one list. Booking status and payment status are tracked separately."
        actions={
          <ButtonLink to="/admin/bookings/new">
            <CalendarPlus aria-hidden="true" className="size-4" />
            New walk-in
          </ButtonLink>
        }
      />

      <form
        role="search"
        aria-label="Filter bookings"
        onSubmit={(e) => e.preventDefault()}
        className="mb-4 grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Input
          type="search"
          label="Search"
          placeholder="Reference, name or phone"
          value={filters.query}
          onChange={setFilter('query')}
        />
        <Input type="date" label="Date" value={filters.date} onChange={setFilter('date')} />
        <Select label="Booking status" value={filters.status} onChange={setFilter('status')}>
          <option value="">Any status</option>
          {Object.values(BookingStatus).map((s) => (
            <option key={s} value={s}>
              {title(s)}
            </option>
          ))}
        </Select>
        <Select label="Source" value={filters.source} onChange={setFilter('source')}>
          <option value="">Any source</option>
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select label="Payment status" value={filters.payment} onChange={setFilter('payment')}>
          <option value="">Any payment status</option>
          {Object.values(PaymentStatus).map((s) => (
            <option key={s} value={s}>
              {title(s)}
            </option>
          ))}
        </Select>
      </form>

      {query.error ? (
        <ErrorState message="Bookings could not be loaded." onRetry={query.refetch} />
      ) : !query.data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p role="status" className="mb-2 text-sm text-muted">
            {query.data.length} {query.data.length === 1 ? 'booking' : 'bookings'}
          </p>
          <Table
            caption="Bookings"
            columns={columns}
            rows={query.data}
            empty={
              <EmptyState
                title={filtering ? 'No bookings match these filters' : 'No bookings yet'}
                description={filtering ? 'Try removing a filter.' : 'Create a walk-in to add one.'}
                action={
                  filtering && (
                    <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                      Clear filters
                    </Button>
                  )
                }
              />
            }
          />
        </>
      )}
    </div>
  )
}
