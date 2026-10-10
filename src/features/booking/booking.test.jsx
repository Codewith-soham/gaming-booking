import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Providers from '../../app/providers'
import { routes } from '../../app/router'
import { bookingService, availabilityService } from '../../services'
import { at, bookingInput, setupDomain, teardownDomain } from '../../test/helpers'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

const tomorrow = '2026-10-13'

async function pickWhen(user, { date = tomorrow, duration = '60' } = {}) {
  const dateInput = await screen.findByLabelText('Date')
  await user.clear(dateInput)
  await user.type(dateInput, date)
  await user.selectOptions(screen.getByLabelText('Session length'), duration)
}

describe('Booking flow', () => {
  it('books a station end to end and shows it in booking history', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_kp')

    await pickWhen(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Step 2: pick PC-03 at 14:00
    await user.click(await screen.findByRole('button', { name: 'PC-03 at 2:00 PM' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Step 3: details are prefilled from the demo customer
    expect(screen.getByLabelText('Full name')).toHaveValue('Aarav Mehta')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Step 4: review
    expect(await screen.findByText('Review your booking')).toBeInTheDocument()
    expect(screen.getByText('PC-03 (PC)')).toBeInTheDocument()
    expect(await screen.findByText('Total')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }))

    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument()
    expect(screen.getByTestId('reference')).toHaveTextContent('GH-00014')
    expect(screen.getByText(/no payment was taken/i)).toBeInTheDocument()

    // It is in shared state, so admin availability no longer offers that slot
    const booking = await bookingService.getBookingById('bk_014')
    expect(booking).toMatchObject({
      source: 'WEBSITE',
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    })
    const slots = (
      await availabilityService.getAvailability({
        hubId: 'hub_pixel',
        branchId: 'br_kp',
        date: tomorrow,
        durationMinutes: 60,
        resourceId: 'res_kp_pc03',
      })
    ).resources[0].slots
    expect(slots.map((s) => s.startAt)).not.toContain(at('14:00', 1).toISOString())

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'My bookings' }))
    const row = (await screen.findByText(/GH-00014/)).closest('li')
    expect(within(row).getByText('Confirmed')).toBeInTheDocument()
    expect(within(row).getByText('Unpaid')).toBeInTheDocument()
  })

  it('keeps selections when moving back and forth between steps', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_kp')

    await pickWhen(user, { duration: '90' })
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'PC-04 at 3:00 PM' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'PC-04 at 3:00 PM' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText('Date')).toHaveValue(tomorrow)
    expect(screen.getByLabelText('Session length')).toHaveValue('90')
  })

  it('requires a slot before continuing and validates details', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_kp')

    await pickWhen(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('button', { name: 'PC-03 at 2:00 PM' })
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'PC-03 at 2:00 PM' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await user.clear(screen.getByLabelText('Full name'))
    await user.clear(screen.getByLabelText('Phone'))
    await user.clear(screen.getByLabelText('Email (optional)'))
    await user.type(screen.getByLabelText('Email (optional)'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument()
    // Values are preserved after the validation error
    expect(screen.getByLabelText('Email (optional)')).toHaveValue('nope')
  })

  it('rejects a conflicting booking, explains why, and sends the customer back to pick again', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_kp')

    await pickWhen(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'PC-03 at 2:00 PM' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Review your booking')

    // Someone else books the same station while the customer is on the review step
    await bookingService.createBooking(bookingInput({ customerId: 'cust_002' }))

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available')
    expect(await screen.findByText('Pick a station and start time')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'PC-03 at 2:00 PM' })).not.toBeInTheDocument(),
    )
  })

  it('only offers stations that are free for the whole session today', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_kp')
    await pickWhen(user, { date: '2026-10-12', duration: '240' })
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    // PC-01 and PC-02 are busy for the next hour or two, but PC-04 is free all afternoon
    expect(await screen.findByText(/PC-04/)).toBeInTheDocument()
  })

  it('offers only the branch types in the type filter and filters stations', async () => {
    const user = userEvent.setup()
    renderAt('/book/hub_pixel?branch=br_baner')
    await pickWhen(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('button', { name: 'PC-01 at 11:00 AM' })
    const select = screen.getByLabelText('Station type')
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Any type',
      'PC',
      'Racing simulator',
    ])
    await user.selectOptions(select, 'RACING_SIMULATOR')
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'PC-01 at 11:00 AM' })).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', { name: 'Racing Simulator-01 at 11:00 AM' }),
    ).toBeInTheDocument()
  })

  it('shows not found for an unknown hub', async () => {
    renderAt('/book/nope')
    expect(await screen.findByText('Hub not found')).toBeInTheDocument()
  })
})

describe('Booking details page', () => {
  it('shows separate booking and payment status, price and a QR placeholder', async () => {
    renderAt('/bookings/bk_006')
    expect(await screen.findByRole('heading', { name: 'Booking GH-00006' })).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText(/Mock status/)).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Demo QR placeholder for GH-00006/ }),
    ).toBeInTheDocument()
    // Already cancelled: no cancel action
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('cancels an eligible booking after confirmation and frees the slot', async () => {
    const user = userEvent.setup()
    // bk_005 belongs to cust_005; view as that customer
    await bookingService.getBookingById('bk_005')
    const { customerService } = await import('../../services')
    await customerService.setCurrentCustomer('cust_005')

    renderAt('/bookings/bk_005')
    expect(await screen.findByText(/Free to cancel until 2 hours/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Keep booking' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await bookingService.getBookingById('bk_005')).status).toBe('CONFIRMED')

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Yes, cancel booking',
      }),
    )
    await waitFor(async () =>
      expect((await bookingService.getBookingById('bk_005')).status).toBe('CANCELLED'),
    )
    expect((await bookingService.getBookingById('bk_005')).paymentStatus).toBe('UNPAID')
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('disables cancelling inside the cutoff and explains why', async () => {
    renderAt('/bookings/bk_002') // cust_002's booking starts in 20 minutes; viewing as cust_001
    const button = await screen.findByRole('button', { name: 'Cancel booking' })
    expect(button).toBeDisabled()
    expect(screen.getByText('You can only cancel your own bookings.')).toBeInTheDocument()
  })

  it('shows not found for an unknown booking', async () => {
    renderAt('/bookings/nope')
    expect(await screen.findByText('Booking not found')).toBeInTheDocument()
  })
})

describe('My bookings page', () => {
  it('splits bookings into upcoming, past and cancelled for the demo customer', async () => {
    const user = userEvent.setup()
    renderAt('/my-bookings')
    // cust_001: bk_001 (running now, ends 12:30) and bk_006 (cancelled)
    expect(await screen.findByText(/GH-00001/)).toBeInTheDocument()
    expect(screen.queryByText(/GH-00006/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Cancelled' }))
    expect(await screen.findByText(/GH-00006/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Past' }))
    expect(await screen.findByText('No past bookings yet.')).toBeInTheDocument()
  })

  it('switches the demo customer and links to details', async () => {
    const user = userEvent.setup()
    renderAt('/my-bookings')
    await screen.findByText(/GH-00001/)
    await user.selectOptions(screen.getByLabelText('Viewing as (demo)'), 'cust_006')
    await user.click(await screen.findByRole('tab', { name: 'Past' }))
    expect(await screen.findByText(/GH-00007/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details for GH-00007' })).toHaveAttribute(
      'href',
      '/bookings/bk_007',
    )
  })

  it('shows an empty state with a link to find a hub', async () => {
    const user = userEvent.setup()
    renderAt('/my-bookings')
    await screen.findByText(/GH-00001/)
    await user.selectOptions(screen.getByLabelText('Viewing as (demo)'), 'cust_007')
    expect(await screen.findByText('You have no upcoming bookings.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find a hub' })).toHaveAttribute('href', '/')
  })
})
