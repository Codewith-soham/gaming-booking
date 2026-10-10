import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PriceBreakdown from '../../../components/booking/PriceBreakdown'
import QrPlaceholder from '../../../components/booking/QrPlaceholder'
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/booking/StatusBadges'
import {
  Badge,
  Button,
  Card,
  DemoTag,
  Dialog,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
  ButtonLink,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { bookingService, customerService } from '../../../services'
import { getCancellationEligibility } from '../../../utils/bookingRules'
import { ActorRole } from '../../../utils/constants'
import { isServiceError } from '../../../utils/errors'
import { formatDateTimeRange, typeLabel } from '../../../utils/format'

export default function BookingDetailsPage() {
  const { bookingId } = useParams()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const bookingQuery = useServiceQuery(() => bookingService.getBookingById(bookingId), [bookingId])
  const customerQuery = useServiceQuery(() => customerService.getCurrentCustomer(), [])
  const booking = bookingQuery.data
  const customer = customerQuery.data

  if (bookingQuery.error?.code === 'NOT_FOUND') {
    return (
      <EmptyState
        title="Booking not found"
        description="We couldn't find a booking with that reference."
        action={
          <ButtonLink to="/my-bookings" variant="secondary">
            My bookings
          </ButtonLink>
        }
      />
    )
  }
  if (bookingQuery.error) {
    return <ErrorState message="This booking could not be loaded." onRetry={bookingQuery.refetch} />
  }
  if (!booking || !customer) return <Skeleton className="h-96 w-full" />

  const actor = { role: ActorRole.CUSTOMER, id: customer.id }
  const eligibility = getCancellationEligibility(booking, booking.session, actor)
  const showCancel = ['PENDING', 'CONFIRMED'].includes(booking.status)

  async function cancel() {
    setBusy(true)
    try {
      await bookingService.cancelBooking(booking.id, actor)
      toast.success(`Booking ${booking.reference} cancelled.`)
    } catch (err) {
      toast.error(isServiceError(err) ? err.message : 'The booking could not be cancelled.')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/my-bookings" className="hover:text-ink">
          My bookings
        </Link>{' '}
        / <span className="tabular text-ink">{booking.reference}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Booking {booking.reference}</h1>
        <DemoTag>Demo booking</DemoTag>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-4 md:col-span-2">
          <dl className="space-y-3 text-sm">
            <Item label="Hub">
              <Link to={`/hubs/${booking.hub.slug}`} className="text-accent hover:underline">
                {booking.hub.name}
              </Link>{' '}
              - {booking.branch.name}
            </Item>
            <Item label="Station">
              {booking.resource.name} ({typeLabel(booking.resource.type)})
            </Item>
            <Item label="When">{formatDateTimeRange(booking.startAt, booking.endAt)}</Item>
            <Item label="Booked for">{booking.customer.name}</Item>
            <Item label="Booking status">
              <BookingStatusBadge status={booking.status} />
            </Item>
            <Item label="Payment status">
              <span className="inline-flex items-center gap-2">
                <PaymentStatusBadge status={booking.paymentStatus} />
                <span className="text-xs text-muted">Mock status - no real payment</span>
              </span>
            </Item>
            {booking.session && (
              <Item label="Session">
                <Badge>{booking.session.status}</Badge>
              </Item>
            )}
          </dl>
          <PriceBreakdown price={booking.priceBreakdown} />
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <QrPlaceholder reference={booking.reference} />
        </Card>
      </div>

      {showCancel && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Cancel this booking</h2>
          <p className="text-sm text-muted">{eligibility.reason}</p>
          <p className="text-xs text-muted">
            Cancelling does not change the payment status. Refunds are handled separately.
          </p>
          <Button
            variant="destructive"
            disabled={!eligibility.allowed}
            onClick={() => setConfirming(true)}
          >
            Cancel booking
          </Button>
        </Card>
      )}

      <Dialog
        open={confirming}
        destructive
        title="Cancel this booking?"
        description={`${booking.resource.name}, ${formatDateTimeRange(booking.startAt, booking.endAt)}. The time slot will become available to others.`}
        confirmLabel={busy ? 'Cancelling...' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

function Item({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
