import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/booking/StatusBadges'
import {
  Card,
  DemoTag,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Table,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { customerService } from '../../../services'
import { formatCurrency, formatDate, formatDateTimeRange } from '../../../utils/format'
import { useAdmin } from '../../admin/adminContext'

export default function CustomersPage() {
  const { scope } = useAdmin()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const list = useServiceQuery(
    () => customerService.listCustomers({ query: search, hubId: scope.hubId }),
    [search, scope.hubId],
  )
  const detail = useServiceQuery(
    () => (selectedId ? customerService.getCustomerById(selectedId) : Promise.resolve(null)),
    [selectedId],
  )

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <button
          type="button"
          aria-pressed={c.id === selectedId}
          onClick={() => setSelectedId(c.id)}
          className="font-medium text-accent hover:underline"
        >
          {c.name}
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', className: 'tabular' },
    {
      key: 'bookings',
      header: 'Bookings',
      className: 'tabular text-right',
      render: (c) => c.stats.bookingCount,
    },
    {
      key: 'paid',
      header: 'Paid (mock)',
      className: 'tabular text-right',
      render: (c) => formatCurrency(c.stats.totalPaid),
    },
    {
      key: 'last',
      header: 'Last booking',
      className: 'whitespace-nowrap',
      render: (c) => (c.stats.lastBookingAt ? formatDate(c.stats.lastBookingAt) : '-'),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customers who have booked at this hub. All people here are fictional."
        actions={<DemoTag>Demo data</DemoTag>}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          label="Search customers"
          placeholder="Name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.error ? (
        <ErrorState message="Customers could not be loaded." onRetry={list.refetch} />
      ) : !list.data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Table
              caption="Customers"
              columns={columns}
              rows={list.data}
              empty={
                <EmptyState
                  title="No customers found"
                  description={
                    search ? 'Try a different search.' : 'No customers have booked here yet.'
                  }
                />
              }
            />
          </div>

          <aside aria-label="Customer history">
            {!detail.data ? (
              <Card className="text-sm text-muted">Select a customer to see their bookings.</Card>
            ) : (
              <Card className="space-y-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{detail.data.name}</h2>
                  <p className="text-sm text-muted">
                    {detail.data.phone}
                    {detail.data.email && ` - ${detail.data.email}`}
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {detail.data.bookings.map((b) => (
                    <li key={b.id} className="space-y-1 py-2 text-sm">
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="tabular text-accent hover:underline"
                      >
                        {b.reference}
                      </Link>
                      <p className="tabular text-muted">
                        {formatDateTimeRange(b.startAt, b.endAt)}
                      </p>
                      <div className="flex gap-2">
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
