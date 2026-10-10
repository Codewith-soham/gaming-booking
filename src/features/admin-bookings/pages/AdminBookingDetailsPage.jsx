import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import PriceBreakdown from '../../../components/booking/PriceBreakdown'
import SourceBadge from '../../../components/booking/SourceBadge'
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/booking/StatusBadges'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DemoTag,
  Dialog,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  useToast,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { bookingService, sessionService } from '../../../services'
import { getCancellationEligibility } from '../../../utils/bookingRules'
import { ActorRole, BookingStatus, PaymentStatus } from '../../../utils/constants'
import { isServiceError } from '../../../utils/errors'
import { formatDateTimeRange, typeLabel } from '../../../utils/format'

const STAFF = { role: ActorRole.STAFF }

export default function AdminBookingDetailsPage() {
  const { bookingId } = useParams()
  const toast = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)

  const query = useServiceQuery(() => bookingService.getBookingById(bookingId), [bookingId])
  const booking = query.data

  if (query.error?.code === 'NOT_FOUND') {
    return (
      <EmptyState
        title="Booking not found"
        action={
          <ButtonLink to="/admin/bookings" variant="secondary">
            Back to bookings
          </ButtonLink>
        }
      />
    )
  }
  if (query.error)
    return <ErrorState message="Could not load this booking." onRetry={query.refetch} />
  if (!booking) return <Skeleton className="h-96 w-full" />

  const eligibility = getCancellationEligibility(booking, booking.session, STAFF)
  const canStart = booking.status === BookingStatus.CONFIRMED && !booking.session

  async function run(action, success) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (err) {
      toast.error(isServiceError(err) ? err.message : 'That did not work. Please try again.')
    } finally {
      setBusy(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking ${booking.reference}`}
        description={`${booking.customer.name} - ${booking.resource.name}`}
        actions={
          <>
            <DemoTag>Demo data</DemoTag>
            <ButtonLink to="/admin/bookings" variant="ghost">
              Back to bookings
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <dl className="space-y-3 text-sm">
            <Item label="Hub">
              {booking.hub.name} - {booking.branch.name}
            </Item>
            <Item label="Station">
              {booking.resource.name} ({typeLabel(booking.resource.type)})
            </Item>
            <Item label="When">
              <span className="tabular">{formatDateTimeRange(booking.startAt, booking.endAt)}</span>
            </Item>
            <Item label="Customer">
              {booking.customer.name}, {booking.customer.phone}
            </Item>
            <Item label="Source">
              <SourceBadge source={booking.source} />
            </Item>
            <Item label="Booking status">
              <BookingStatusBadge status={booking.status} />
            </Item>
            <Item label="Payment status">
              <PaymentStatusBadge status={booking.paymentStatus} />
            </Item>
            {booking.session && (
              <Item label="Session">
                <Badge>{booking.session.status}</Badge>
              </Item>
            )}
            {booking.notes && <Item label="Notes">{booking.notes}</Item>}
          </dl>
          <PriceBreakdown price={booking.priceBreakdown} />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Payment (mock)</h2>
            <p className="text-xs text-muted">
              Changing this only updates demo data. No money moves, and the booking status stays as
              it is.
            </p>
            <Select
              label="Payment status"
              value={booking.paymentStatus}
              disabled={busy}
              onChange={(e) =>
                run(
                  () => bookingService.updateBookingPaymentStatus(booking.id, e.target.value),
                  'Payment status updated.',
                )
              }
            >
              {Object.values(PaymentStatus).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Actions</h2>
            {canStart && (
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  run(() => sessionService.startSession(booking.id), 'Session started.')
                }
              >
                Start session
              </Button>
            )}
            {booking.session && (
              <Link to="/admin/sessions" className="block text-sm text-accent hover:underline">
                Manage session
              </Link>
            )}
            {['PENDING', 'CONFIRMED'].includes(booking.status) && (
              <>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={!eligibility.allowed || busy}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel booking
                </Button>
                <p className="text-xs text-muted">{eligibility.reason}</p>
              </>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={confirmCancel}
        destructive
        title="Cancel this booking?"
        description={`${booking.reference} for ${booking.customer.name}. The time slot will open up. Payment status is not changed.`}
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        onConfirm={() =>
          run(() => bookingService.cancelBooking(booking.id, STAFF), 'Booking cancelled.')
        }
        onCancel={() => setConfirmCancel(false)}
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
