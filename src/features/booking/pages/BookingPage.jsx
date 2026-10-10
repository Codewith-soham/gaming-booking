import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PriceBreakdown from '../../../components/booking/PriceBreakdown'
import SlotPicker from '../../../components/booking/SlotPicker'
import StepIndicator from '../../../components/booking/StepIndicator'
import {
  Button,
  Card,
  DemoTag,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  ButtonLink,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import {
  availabilityService,
  bookingService,
  customerService,
  hubService,
  pricingService,
  resourceService,
} from '../../../services'
import { now } from '../../../utils/clock'
import { BOOKING_RULES } from '../../../utils/constants'
import { formatDateTimeRange, formatDuration, typeLabel } from '../../../utils/format'
import { isServiceError } from '../../../utils/errors'
import { parseDateKey, plusMinutes, toDateKey } from '../../../utils/time'
import { PaymentStatusBadge } from '../../../components/booking/StatusBadges'

const STEPS = ['When', 'Station and time', 'Your details', 'Review']
const MAX_DAYS_AHEAD = 30
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const durations = []
for (
  let m = BOOKING_RULES.MIN_DURATION_MINUTES;
  m <= BOOKING_RULES.MAX_DURATION_MINUTES;
  m += BOOKING_RULES.SLOT_INCREMENT_MINUTES
) {
  durations.push(m)
}

const digits = (v) => String(v ?? '').replace(/\D/g, '')

function validateDetails(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter your name.'
  const d = digits(form.phone)
  if (d.length < 7 || d.length > 15) errors.phone = 'Enter a valid phone number.'
  if (form.email.trim() && !EMAIL.test(form.email.trim())) errors.email = 'Enter a valid email.'
  return errors
}

export default function BookingPage() {
  const { hubId } = useParams()
  const [params] = useSearchParams()

  // Every choice lives here so moving between steps never loses a selection.
  const [step, setStep] = useState(0)
  const [branchId, setBranchId] = useState(params.get('branch'))
  const [date, setDate] = useState(() => toDateKey(now()))
  const [duration, setDuration] = useState(60)
  const [type, setType] = useState('')
  const [selection, setSelection] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [confirmed, setConfirmed] = useState(null)

  const hubQuery = useServiceQuery(() => hubService.getHubById(hubId), [hubId])
  const branchesQuery = useServiceQuery(() => hubService.listBranches(hubId), [hubId])
  const customerQuery = useServiceQuery(() => customerService.getCurrentCustomer(), [])

  const hub = hubQuery.data
  const branches = branchesQuery.data
  const branch = branches?.find((b) => b.id === branchId) ?? branches?.[0]
  const customer = customerQuery.data
  const details = form ?? {
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
  }

  const dateValid = Boolean(parseDateKey(date))
  const availabilityQuery = useServiceQuery(
    () =>
      branch && dateValid
        ? availabilityService.getAvailability({
            hubId,
            branchId: branch.id,
            date,
            durationMinutes: duration,
            resourceType: type || undefined,
          })
        : Promise.resolve(null),
    [hubId, branch?.id, date, duration, type],
  )

  const priceQuery = useServiceQuery(
    () =>
      selection
        ? pricingService.calculatePrice({
            resource: selection.resource,
            startAt: selection.startAt,
            endAt: selection.endAt,
          })
        : Promise.resolve(null),
    [selection?.resourceId, selection?.startAt, selection?.endAt],
  )

  // Types offered by this branch (independent of the current type filter).
  const branchResources = useServiceQuery(
    () => (branch ? resourceService.listResources({ branchId: branch.id }) : Promise.resolve([])),
    [branch?.id],
  )
  const typeOptions = useMemo(
    () => [...new Set((branchResources.data ?? []).map((r) => r.type))],
    [branchResources.data],
  )

  const today = toDateKey(now())
  const maxDate = toDateKey(plusMinutes(now(), MAX_DAYS_AHEAD * 24 * 60))

  // A chosen slot is only valid for the branch/date/length it was picked under.
  function changeWhen(setter, value) {
    setter(value)
    setSelection(null)
  }

  function go(next) {
    setSubmitError(null)
    setStep(next)
  }

  function next() {
    if (step === 0 && !dateValid) return setErrors({ date: 'Choose a date.' })
    if (step === 2) {
      const found = validateDetails(details)
      setErrors(found)
      if (Object.keys(found).length) return
    }
    setErrors({})
    go(step + 1)
  }

  async function resolveCustomerId() {
    if (customer && digits(details.phone) === digits(customer.phone)) return customer.id
    try {
      const created = await customerService.createCustomer({
        name: details.name,
        phone: details.phone,
        email: details.email,
      })
      return created.id
    } catch (err) {
      // Same phone as an existing demo customer: book under that customer.
      if (isServiceError(err) && err.details?.customerId) return err.details.customerId
      throw err
    }
  }

  async function confirm() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const customerId = await resolveCustomerId()
      const booking = await bookingService.createBooking({
        hubId,
        branchId: branch.id,
        customerId,
        resourceId: selection.resourceId,
        startAt: selection.startAt,
        endAt: selection.endAt,
        source: 'WEBSITE',
      })
      // Demo identity follows the booking so it shows up under My bookings.
      await customerService.setCurrentCustomer(customerId)
      setConfirmed(booking)
    } catch (err) {
      const message = isServiceError(err) ? err.message : 'The booking could not be completed.'
      setSubmitError(message)
      // The slot may have been taken meanwhile: send them back to pick again.
      if (
        isServiceError(err) &&
        ['BOOKING_CONFLICT', 'RESOURCE_UNAVAILABLE', 'RESOURCE_UNDER_MAINTENANCE'].includes(
          err.code,
        )
      ) {
        setSelection(null)
        availabilityQuery.refetch()
        setStep(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setConfirmed(null)
    setSelection(null)
    setForm(null)
    setStep(0)
  }

  if (hubQuery.error?.code === 'NOT_FOUND') {
    return (
      <EmptyState
        title="Hub not found"
        description="We couldn't find the hub you want to book."
        action={
          <ButtonLink to="/" variant="secondary">
            Browse hubs
          </ButtonLink>
        }
      />
    )
  }
  if (hubQuery.error || branchesQuery.error) {
    return <ErrorState message="The booking form could not be loaded." onRetry={hubQuery.refetch} />
  }
  if (!hub || !branch) return <Skeleton className="h-96 w-full" />

  if (confirmed) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card className="space-y-4 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-ok" />
          <h1 className="font-display text-2xl font-bold">Booking confirmed</h1>
          <p className="text-muted">
            Your reference is{' '}
            <strong className="tabular text-ink" data-testid="reference">
              {confirmed.reference}
            </strong>
          </p>
          <dl className="space-y-1 text-left text-sm">
            <Row label="Hub" value={`${confirmed.hub.name} - ${confirmed.branch.name}`} />
            <Row label="Station" value={confirmed.resource.name} />
            <Row label="When" value={formatDateTimeRange(confirmed.startAt, confirmed.endAt)} />
            <Row label="Payment">
              <PaymentStatusBadge status={confirmed.paymentStatus} />
            </Row>
          </dl>
          <PriceBreakdown price={confirmed.priceBreakdown} />
          <p className="text-xs text-muted">
            Demo only: no payment was taken and nothing was sent to the hub.
          </p>
        </Card>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink to={`/bookings/${confirmed.id}`}>View booking</ButtonLink>
          <ButtonLink to="/my-bookings" variant="secondary">
            My bookings
          </ButtonLink>
          <Button variant="ghost" onClick={startOver}>
            Book another
          </Button>
        </div>
      </div>
    )
  }

  const availability = availabilityQuery.data

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Book at {hub.name}</h1>
        <DemoTag>Demo booking - no real payment</DemoTag>
      </div>

      <StepIndicator steps={STEPS} current={step} onSelect={go} />

      {submitError && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          {submitError}
        </div>
      )}

      <Card className="space-y-5">
        {step === 0 && (
          <>
            <h2 className="font-display text-lg font-semibold">When do you want to play?</h2>
            {branches.length > 1 && (
              <Select
                label="Branch"
                value={branch.id}
                onChange={(e) => changeWhen(setBranchId, e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Input
              type="date"
              label="Date"
              value={date}
              min={today}
              max={maxDate}
              error={errors.date}
              onChange={(e) => changeWhen(setDate, e.target.value)}
            />
            <Select
              label="Session length"
              value={duration}
              onChange={(e) => changeWhen(setDuration, Number(e.target.value))}
            >
              {durations.map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)}
                </option>
              ))}
            </Select>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-lg font-semibold">Pick a station and start time</h2>
            <p className="text-sm text-muted">
              {branch.name} - {date} - {formatDuration(duration)}. Times are generated from current
              bookings and station status.
            </p>
            <Select label="Station type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any type</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </Select>
            {availabilityQuery.error ? (
              <ErrorState
                message={
                  isServiceError(availabilityQuery.error)
                    ? availabilityQuery.error.message
                    : 'Availability could not be loaded.'
                }
                onRetry={availabilityQuery.refetch}
              />
            ) : !availability ? (
              <div aria-busy="true" className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <SlotPicker
                availability={availability}
                selection={selection}
                onSelect={setSelection}
              />
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-lg font-semibold">Your details</h2>
            <p className="text-sm text-muted">
              Demo identity: prefilled from the demo customer. Use a different phone number to book
              as someone else.
            </p>
            <Input
              label="Full name"
              value={details.name}
              error={errors.name}
              onChange={(e) => setForm({ ...details, name: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={details.phone}
              error={errors.phone}
              onChange={(e) => setForm({ ...details, phone: e.target.value })}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={details.email}
              error={errors.email}
              onChange={(e) => setForm({ ...details, email: e.target.value })}
            />
          </>
        )}

        {step === 3 && selection && (
          <>
            <h2 className="font-display text-lg font-semibold">Review your booking</h2>
            <dl className="space-y-1 text-sm">
              <Row label="Hub" value={`${hub.name} - ${branch.name}`} />
              <Row
                label="Station"
                value={`${selection.resource.name} (${typeLabel(selection.resource.type)})`}
              />
              <Row label="When" value={formatDateTimeRange(selection.startAt, selection.endAt)} />
              <Row label="Booked for" value={`${details.name} (${details.phone})`} />
              <Row label="Payment">
                <span className="text-muted">Pay at the hub (not taken in this demo)</span>
              </Row>
            </dl>
            {priceQuery.data ? (
              <PriceBreakdown price={priceQuery.data} />
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0 || submitting} onClick={() => go(step - 1)}>
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={next} disabled={(step === 1 && !selection) || (step === 0 && !branch)}>
            Continue
          </Button>
        ) : (
          <Button onClick={confirm} loading={submitting} disabled={!selection}>
            Confirm booking
          </Button>
        )}
      </div>
      {step === 1 && !selection && availability && !availability.closed && (
        <p className="text-right text-xs text-muted">Choose a start time to continue.</p>
      )}
    </div>
  )
}

function Row({ label, value, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children ?? value}</dd>
    </div>
  )
}
