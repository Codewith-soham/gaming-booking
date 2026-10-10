import { useState } from 'react'
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/booking/StatusBadges'
import {
  Card,
  DemoTag,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  Tabs,
  ButtonLink,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { bookingService, customerService } from '../../../services'
import { now } from '../../../utils/clock'
import { formatCurrency, formatDateTimeRange } from '../../../utils/format'
import { toMs } from '../../../utils/time'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
]

function bucket(booking, at) {
  if (booking.status === 'CANCELLED') return 'cancelled'
  const live = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  return live && toMs(booking.endAt) > at ? 'upcoming' : 'past'
}

const EMPTY = {
  upcoming: 'You have no upcoming bookings.',
  past: 'No past bookings yet.',
  cancelled: 'No cancelled bookings.',
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState('upcoming')
  const customerQuery = useServiceQuery(() => customerService.getCurrentCustomer(), [])
  const customersQuery = useServiceQuery(() => customerService.listCustomers(), [])
  const customer = customerQuery.data

  const bookingsQuery = useServiceQuery(
    () =>
      customer ? bookingService.listBookings({ customerId: customer.id }) : Promise.resolve(null),
    [customer?.id],
  )

  if (customerQuery.error || bookingsQuery.error) {
    return (
      <ErrorState message="Your bookings could not be loaded." onRetry={bookingsQuery.refetch} />
    )
  }

  const at = toMs(now())
  const all = bookingsQuery.data
  const shown = all
    ?.filter((b) => bucket(b, at) === tab)
    // Upcoming: soonest first. Past/cancelled: most recent first (service default).
    .sort((a, b) => (tab === 'upcoming' ? a.startAt.localeCompare(b.startAt) : 0))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">My bookings</h1>
          <DemoTag>Demo identity - no real account</DemoTag>
        </div>
        {customersQuery.data && customer && (
          <div className="w-full max-w-xs">
            <Select
              label="Viewing as (demo)"
              value={customer.id}
              onChange={(e) => customerService.setCurrentCustomer(e.target.value)}
            >
              {customersQuery.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Booking filters" />

      {!shown ? (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={EMPTY[tab]}
          action={
            tab === 'upcoming' ? (
              <ButtonLink to="/" variant="secondary">
                Find a hub
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((b) => (
            <li key={b.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">
                    {b.hub.name} - {b.resource.name}
                  </p>
                  <p className="tabular text-sm text-muted">
                    {formatDateTimeRange(b.startAt, b.endAt)}
                  </p>
                  <p className="tabular text-xs text-muted">
                    {b.reference} - {formatCurrency(b.totalPrice)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BookingStatusBadge status={b.status} />
                  <PaymentStatusBadge status={b.paymentStatus} />
                  <ButtonLink
                    to={`/bookings/${b.id}`}
                    aria-label={`View details for ${b.reference}`}
                    variant="secondary"
                  >
                    Details
                  </ButtonLink>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
