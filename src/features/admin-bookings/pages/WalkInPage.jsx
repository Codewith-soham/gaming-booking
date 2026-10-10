import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import PriceBreakdown from '../../../components/booking/PriceBreakdown'
import {
  Button,
  ButtonLink,
  Card,
  DemoTag,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { bookingService, customerService, pricingService, resourceService } from '../../../services'
import { now } from '../../../utils/clock'
import { BOOKING_RULES, OperationalStatus } from '../../../utils/constants'
import { isServiceError } from '../../../utils/errors'
import { formatDuration, typeLabel } from '../../../utils/format'
import { dateAt, floorToIncrement, parseDateKey, plusMinutes, toDateKey } from '../../../utils/time'
import { useAdmin } from '../../admin/adminContext'

const NEW_CUSTOMER = '__new__'
const PAYMENTS = [
  ['UNPAID', 'Unpaid'],
  ['PENDING', 'Payment pending'],
  ['PAID', 'Paid (mock)'],
]
const digits = (v) => String(v ?? '').replace(/\D/g, '')

const durations = []
for (
  let m = BOOKING_RULES.MIN_DURATION_MINUTES;
  m <= BOOKING_RULES.MAX_DURATION_MINUTES;
  m += BOOKING_RULES.SLOT_INCREMENT_MINUTES
) {
  durations.push(m)
}

function toTimeValue(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function WalkInPage() {
  const { hub, branches, branchId: scopedBranch } = useAdmin()
  const navigate = useNavigate()
  const toast = useToast()

  const start = floorToIncrement(now(), BOOKING_RULES.SLOT_INCREMENT_MINUTES)
  const [chosenBranch, setBranchId] = useState('')
  // Falls back to the branch picked in the top bar, then the first branch.
  const branchId = chosenBranch || scopedBranch || branches[0]?.id || ''
  const [resourceId, setResourceId] = useState('')
  const [date, setDate] = useState(toDateKey(start))
  const [time, setTime] = useState(toTimeValue(start))
  const [duration, setDuration] = useState(60)
  const [customerId, setCustomerId] = useState('')
  const [guest, setGuest] = useState({ name: '', phone: '' })
  const [payment, setPayment] = useState('UNPAID')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const customers = useServiceQuery(() => customerService.listCustomers(), [])
  const resources = useServiceQuery(
    () => resourceService.listResources({ hubId: hub.id, branchId: branchId || undefined }),
    [hub.id, branchId],
  )
  const bookable = (resources.data ?? []).filter(
    (r) => r.operationalStatus === OperationalStatus.AVAILABLE,
  )
  const resource = bookable.find((r) => r.id === resourceId)

  const range = useMemo(() => {
    if (!parseDateKey(date) || !/^\d{2}:\d{2}$/.test(time)) return null
    const startAt = dateAt(date, time)
    return { startAt, endAt: plusMinutes(startAt, duration) }
  }, [date, time, duration])

  const price = useServiceQuery(
    () =>
      resource && range
        ? pricingService.calculatePrice({ resource, ...range })
        : Promise.resolve(null),
    [resource?.id, range?.startAt?.getTime(), range?.endAt?.getTime()],
  )

  function validate() {
    const found = {}
    if (!branchId) found.branch = 'Choose a branch.'
    if (!resource) found.resource = 'Choose a station.'
    if (!range) found.time = 'Enter a valid date and start time.'
    if (!customerId) found.customer = 'Choose a customer or add a new one.'
    if (customerId === NEW_CUSTOMER) {
      if (!guest.name.trim()) found.name = 'Enter the customer name.'
      const d = digits(guest.phone).length
      if (d < 7 || d > 15) found.phone = 'Enter a valid phone number.'
    }
    setErrors(found)
    return Object.keys(found).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      let id = customerId
      if (customerId === NEW_CUSTOMER) {
        const created = await customerService.createCustomer(guest)
        id = created.id
      }
      const booking = await bookingService.createBooking({
        hubId: hub.id,
        branchId,
        customerId: id,
        resourceId: resource.id,
        startAt: range.startAt,
        endAt: range.endAt,
        source: 'ADMIN',
        paymentStatus: payment,
        notes,
      })
      toast.success(`Walk-in ${booking.reference} created.`)
      navigate(`/admin/bookings/${booking.id}`)
    } catch (err) {
      // Values stay in the form so staff can adjust the time or station and retry.
      setFormError(isServiceError(err) ? err.message : 'The booking could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!resources.data || !customers.data) return <Skeleton className="h-96 w-full" />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New walk-in booking"
        description="Uses the same booking rules as the website, so it blocks that time for online customers too."
        actions={
          <>
            <DemoTag>Demo data</DemoTag>
            <ButtonLink to="/admin/bookings" variant="ghost">
              Cancel
            </ButtonLink>
          </>
        }
      />

      <form onSubmit={submit} noValidate className="space-y-6">
        {formError && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
            {formError}
          </div>
        )}

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Customer</h2>
          <Select
            label="Customer"
            value={customerId}
            error={errors.customer}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select a customer...</option>
            {customers.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
            <option value={NEW_CUSTOMER}>+ Add new demo customer</option>
          </Select>
          {customerId === NEW_CUSTOMER && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                value={guest.name}
                error={errors.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                value={guest.phone}
                error={errors.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
              />
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Station and time</h2>
          {branches.length > 1 && (
            <Select
              label="Branch"
              value={branchId}
              error={errors.branch}
              onChange={(e) => {
                setBranchId(e.target.value)
                setResourceId('')
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Station"
            value={resourceId}
            error={errors.resource}
            helper="Stations under maintenance or offline are not listed."
            onChange={(e) => setResourceId(e.target.value)}
          >
            <option value="">Select a station...</option>
            {bookable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} - {typeLabel(r.type)}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              type="date"
              label="Date"
              value={date}
              error={errors.time}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              type="time"
              label="Start time"
              step={BOOKING_RULES.SLOT_INCREMENT_MINUTES * 60}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <Select
              label="Duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {durations.map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Payment (mock) and notes</h2>
          <Select
            label="Payment status"
            value={payment}
            helper="Records what staff collected. No real payment is processed."
            onChange={(e) => setPayment(e.target.value)}
          >
            {PAYMENTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Textarea
            label="Notes (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {price.data && <PriceBreakdown price={price.data} />}
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" loading={submitting}>
            Create walk-in booking
          </Button>
        </div>
      </form>
    </div>
  )
}
