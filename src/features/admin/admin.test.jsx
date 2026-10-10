import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Providers from '../../app/providers'
import { routes } from '../../app/router'
import { bookingService, resourceService, sessionService } from '../../services'
import { setClock } from '../../utils/clock'
import { at, bookingInput, setupDomain, teardownDomain } from '../../test/helpers'
import { loginAdmin } from './adminSession'

beforeEach(() => {
  setupDomain()
  loginAdmin()
})
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

const main = () => within(screen.getByRole('main'))

// Same effect as picking the branch in the top bar.
function scopeTo(branchId) {
  localStorage.setItem(
    'gaming-hub-demo-admin-scope',
    JSON.stringify({ hubId: 'hub_pixel', branchId }),
  )
}

describe('demo login and scope', () => {
  it('signs in from the login page and lands on the dashboard', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    renderAt('/admin')
    await user.click(await screen.findByRole('button', { name: 'Continue as demo staff' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('signs out back to the login page', async () => {
    const user = userEvent.setup()
    renderAt('/admin')
    await screen.findByRole('heading', { name: 'Dashboard' })
    await user.click(screen.getByRole('button', { name: /Sign out/ }))
    expect(await screen.findByText('Prototype only')).toBeInTheDocument()
  })

  it('scopes pages to the chosen branch', async () => {
    const user = userEvent.setup()
    renderAt('/admin/stations')
    await main().findAllByText('PC-01')
    expect(main().getAllByRole('button', { name: /^(PC|PS5|Xbox|Racing)/ })).toHaveLength(14)

    await user.selectOptions(screen.getByLabelText('Branch'), 'br_baner')
    await waitFor(() =>
      expect(main().getAllByRole('button', { name: /^(PC|Racing)/ })).toHaveLength(5),
    )
  })
})

describe('Dashboard', () => {
  it('shows figures derived from the shared data', async () => {
    renderAt('/admin')
    expect(await screen.findByText('Bookings today')).toBeInTheDocument()
    // Pixel Arena today: bk_001, bk_002, bk_003, bk_006 (cancelled), bk_013
    const kpi = (label) => screen.getByText(label).closest('div')
    expect(within(kpi('Bookings today')).getByText('5')).toBeInTheDocument()
    expect(within(kpi('Active sessions')).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Upcoming bookings')).toBeInTheDocument()
    expect(screen.getByText('Station availability')).toBeInTheDocument()
  })

  it('updates when a booking is created elsewhere', async () => {
    renderAt('/admin')
    const kpi = () => screen.getByText('Bookings today').closest('div')
    await within(await screen.findByText('Bookings today').then(() => kpi())).findByText('5')
    await bookingService.createBooking(
      bookingInput({ startAt: at('16:00').toISOString(), endAt: at('17:00').toISOString() }),
    )
    expect(await within(kpi()).findByText('6')).toBeInTheDocument()
  })
})

describe('Admin bookings', () => {
  it('lists online and walk-in bookings together with separate statuses', async () => {
    renderAt('/admin/bookings')
    expect(await screen.findByRole('link', { name: 'GH-00003' })).toBeInTheDocument()
    const row = screen.getByRole('link', { name: 'GH-00006' }).closest('tr')
    // Cancelled booking that is still paid: the two statuses are independent
    expect(within(row).getByText('Cancelled')).toBeInTheDocument()
    expect(within(row).getByText('Paid')).toBeInTheDocument()
    expect(
      within(screen.getByRole('link', { name: 'GH-00003' }).closest('tr')).getByText(
        'Walk-in / admin',
      ),
    ).toBeInTheDocument()
  })

  it('filters by search, status, source and payment', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings')
    await screen.findByRole('link', { name: 'GH-00003' })

    await user.selectOptions(screen.getByLabelText('Booking status'), 'CANCELLED')
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'GH-00003' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'GH-00006' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Booking status'), '')
    await user.selectOptions(screen.getByLabelText('Source'), 'ADMIN')
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'GH-00001' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'GH-00003' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Source'), '')
    await user.selectOptions(screen.getByLabelText('Payment status'), 'UNPAID')
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'GH-00001' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'GH-00002' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Payment status'), '')
    await user.type(screen.getByLabelText('Search'), 'diya')
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'GH-00001' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'GH-00002' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search'))
    await user.type(screen.getByLabelText('Search'), 'zzzz')
    expect(await screen.findByText('No bookings match these filters')).toBeInTheDocument()
  })

  it('changes payment status without touching booking status', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/bk_002')
    expect(await screen.findByRole('heading', { name: 'Booking GH-00002' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Payment status'), 'PAID')
    await waitFor(async () =>
      expect((await bookingService.getBookingById('bk_002')).paymentStatus).toBe('PAID'),
    )
    expect((await bookingService.getBookingById('bk_002')).status).toBe('CONFIRMED')
  })

  it('lets staff cancel inside the customer cutoff after confirming', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/bk_002')
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Yes, cancel booking',
      }),
    )
    await waitFor(async () =>
      expect((await bookingService.getBookingById('bk_002')).status).toBe('CANCELLED'),
    )
  })

  it('starts a session from a confirmed booking', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/bk_003')
    await user.click(await screen.findByRole('button', { name: 'Start session' }))
    await waitFor(async () =>
      expect((await bookingService.getBookingById('bk_003')).session?.status).toBe('ACTIVE'),
    )
  })
})

describe('Walk-in booking', () => {
  it('creates a shared booking that blocks the customer-facing slot', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/new')
    await screen.findByRole('heading', { name: 'New walk-in booking' })

    await user.click(screen.getByRole('button', { name: 'Create walk-in booking' }))
    expect(await screen.findByText('Choose a customer or add a new one.')).toBeInTheDocument()
    expect(screen.getByText('Choose a station.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Customer'), 'cust_004')
    await user.selectOptions(main().getByLabelText('Branch'), 'br_kp')
    await user.selectOptions(screen.getByLabelText('Station'), 'res_kp_pc04')
    await user.selectOptions(screen.getByLabelText('Payment status'), 'PAID')
    expect(await screen.findByText('Total')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create walk-in booking' }))

    expect(await screen.findByRole('heading', { name: /Booking GH-00014/ })).toBeInTheDocument()
    const booking = await bookingService.getBookingById('bk_014')
    expect(booking).toMatchObject({
      source: 'ADMIN',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      resourceId: 'res_kp_pc04',
    })
    // Same availability calculation: a website booking on that station now conflicts
    await expect(
      bookingService.createBooking(
        bookingInput({
          resourceId: 'res_kp_pc04',
          startAt: at('12:30').toISOString(),
          endAt: at('13:00').toISOString(),
        }),
      ),
    ).rejects.toMatchObject({ code: 'BOOKING_CONFLICT' })
  })

  it('shows the service error and keeps the form values on conflict', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/new')
    await screen.findByRole('heading', { name: 'New walk-in booking' })
    await user.selectOptions(screen.getByLabelText('Customer'), 'cust_004')
    await user.selectOptions(main().getByLabelText('Branch'), 'br_kp')
    // PC-02 is reserved by bk_003 at 12:00-13:00
    await user.selectOptions(screen.getByLabelText('Station'), 'res_kp_pc02')
    await user.click(screen.getByRole('button', { name: 'Create walk-in booking' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available')
    expect(screen.getByLabelText('Station')).toHaveValue('res_kp_pc02')
    expect(screen.getByLabelText('Customer')).toHaveValue('cust_004')
  })

  it('does not offer stations under maintenance and can quick-create a customer', async () => {
    const user = userEvent.setup()
    renderAt('/admin/bookings/new')
    await screen.findByRole('heading', { name: 'New walk-in booking' })
    await user.selectOptions(main().getByLabelText('Branch'), 'br_kp')
    const options = [...screen.getByLabelText('Station').options].map((o) => o.textContent)
    expect(options.some((o) => o.startsWith('PC-05'))).toBe(false) // maintenance
    expect(options.some((o) => o.startsWith('PC-06'))).toBe(false) // offline
    expect(options.some((o) => o.startsWith('PC-04'))).toBe(true)

    await user.selectOptions(screen.getByLabelText('Customer'), '__new__')
    await user.type(screen.getByLabelText('Name'), 'Neha Joshi')
    await user.type(screen.getByLabelText('Phone'), '98765 43210')
    await user.selectOptions(screen.getByLabelText('Station'), 'res_kp_pc04')
    await user.click(screen.getByRole('button', { name: 'Create walk-in booking' }))
    expect(await screen.findByRole('heading', { name: /Booking GH-00014/ })).toBeInTheDocument()
    expect((await bookingService.getBookingById('bk_014')).customer.name).toBe('Neha Joshi')
  })
})

describe('Live stations', () => {
  it('shows derived states with text labels', async () => {
    scopeTo('br_kp')
    renderAt('/admin/stations')
    const card = async (name) =>
      await main().findByRole('button', { name: new RegExp(`^${name}\\b`) })
    expect(within(await card('PC-01')).getByText('Occupied')).toBeInTheDocument()
    expect(within(await card('PC-02')).getByText('Reserved')).toBeInTheDocument()
    expect(within(await card('PC-03')).getByText('Available')).toBeInTheDocument()
    expect(within(await card('PC-05')).getByText('Maintenance')).toBeInTheDocument()
    expect(within(await card('PC-06')).getByText('Offline')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    scopeTo('br_kp')
    const user = userEvent.setup()
    renderAt('/admin/stations')
    await main().findByText('PC-01')
    await user.selectOptions(screen.getByLabelText('Status'), 'MAINTENANCE')
    await waitFor(() => expect(main().queryByText('PC-01')).not.toBeInTheDocument())
    expect(main().getByText('PC-05')).toBeInTheDocument()
  })

  it('marks a free station under maintenance and removes it from availability, then restores it', async () => {
    scopeTo('br_kp')
    const user = userEvent.setup()
    renderAt('/admin/stations')
    await user.click(await main().findByRole('button', { name: /^PC-04\b/ }))
    await user.click(screen.getByRole('button', { name: 'Mark maintenance' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Mark maintenance' }))
    await waitFor(async () =>
      expect((await resourceService.getResourceById('res_kp_pc04')).operationalStatus).toBe(
        'MAINTENANCE',
      ),
    )
    await expect(
      bookingService.createBooking(bookingInput({ resourceId: 'res_kp_pc04' })),
    ).rejects.toMatchObject({ code: 'RESOURCE_UNDER_MAINTENANCE' })

    await user.click(await screen.findByRole('button', { name: 'Restore to available' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Restore to available',
      }),
    )
    await waitFor(async () =>
      expect((await resourceService.getResourceById('res_kp_pc04')).operationalStatus).toBe(
        'AVAILABLE',
      ),
    )
  })

  it('warns and lists the bookings instead of silently dropping them', async () => {
    scopeTo('br_kp')
    const user = userEvent.setup()
    renderAt('/admin/stations')
    await user.click(await main().findByRole('button', { name: /^PC-01\b/ }))
    await user.click(screen.getByRole('button', { name: 'Mark maintenance' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mark maintenance' }),
    )
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('upcoming booking')
    expect(within(alert).getByRole('link', { name: 'Open booking GH-00001' })).toBeInTheDocument()
    expect((await resourceService.getResourceById('res_kp_pc01')).operationalStatus).toBe(
      'AVAILABLE',
    )
    expect((await bookingService.getBookingById('bk_002')).status).toBe('CONFIRMED')
  })
})

describe('Sessions', () => {
  it('shows running sessions with elapsed and remaining time', async () => {
    setClock(() => at('12:25')) // 5 minutes before the session ends
    renderAt('/admin/sessions')
    const card = (await main().findByText('PC-01')).closest('li')
    expect(within(card).getByText('Elapsed')).toBeInTheDocument()
    expect(within(card).getByText('Remaining')).toBeInTheDocument()
    expect(within(card).getByText('Aarav Mehta')).toBeInTheDocument()
    expect(within(card).getByText('Ending soon')).toBeInTheDocument()
  })

  it('rejects an extension that clashes and shows the validation result', async () => {
    const user = userEvent.setup()
    renderAt('/admin/sessions')
    const card = (await main().findByText('PC-01')).closest('li')
    await user.click(within(card).getByRole('button', { name: 'Extend' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Extend' }),
    )
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Cannot extend')
    expect(alert).toHaveTextContent('GH-00002')
    // Nothing changed
    const ses = await sessionService.listSessions({ status: 'ACTIVE' })
    expect(ses[0].extensionCount).toBe(0)
  })

  it('extends a free station and completes the session after confirmation', async () => {
    const user = userEvent.setup()
    await sessionService.startSession('bk_003') // PC-02, free after 1:00 PM
    renderAt('/admin/sessions')
    const card = (await main().findByText('PC-02')).closest('li')
    await user.click(within(card).getByRole('button', { name: 'Extend' }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Extend by'), '60')
    await user.click(within(dialog).getByRole('button', { name: 'Extend' }))
    await waitFor(async () => {
      const active = await sessionService.listSessions({ status: 'ACTIVE' })
      expect(active.find((x) => x.bookingId === 'bk_003').extensionCount).toBe(1)
    })

    await user.click(within(card).getByRole('button', { name: 'Complete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Complete session' }),
    )
    await waitFor(async () => {
      expect((await bookingService.getBookingById('bk_003')).status).toBe('COMPLETED')
    })
    expect((await bookingService.getBookingById('bk_003')).paymentStatus).toBe('PAID')
  })

  it('starts an upcoming session only inside its start window', async () => {
    scopeTo('br_kp')
    const user = userEvent.setup()
    renderAt('/admin/sessions')
    await user.click(await screen.findByRole('tab', { name: 'Upcoming' }))
    const ready = (await main().findAllByText('PC-02')).at(0).closest('li')
    expect(within(ready).getByRole('button', { name: 'Start session' })).toBeEnabled()
    const later = (await main().findByText('PC-01')).closest('li')
    expect(within(later).getByRole('button', { name: 'Start session' })).toBeDisabled()
    expect(within(later).getByText(/Can start from 12:15 PM/)).toBeInTheDocument()

    await user.click(within(ready).getByRole('button', { name: 'Start session' }))
    await waitFor(async () =>
      expect((await bookingService.getBookingById('bk_003')).session?.status).toBe('ACTIVE'),
    )
  })

  it('lists completed sessions', async () => {
    const user = userEvent.setup()
    renderAt('/admin/sessions')
    await user.click(await screen.findByRole('tab', { name: 'Completed' }))
    expect(await main().findByText(/Played 4:05 PM - 6:00 PM/)).toBeInTheDocument()
  })
})

describe('Customers', () => {
  it('searches and shows booking history with both statuses', async () => {
    const user = userEvent.setup()
    renderAt('/admin/customers')
    await user.type(await screen.findByLabelText('Search customers'), 'aarav')
    await waitFor(() => expect(main().queryByText('Diya Nair')).not.toBeInTheDocument())
    await user.click(main().getByRole('button', { name: 'Aarav Mehta' }))
    const history = await screen.findByRole('complementary', { name: 'Customer history' })
    expect(await within(history).findByRole('link', { name: 'GH-00006' })).toBeInTheDocument()
    expect(within(history).getAllByText('Paid').length).toBeGreaterThan(0)
    expect(within(history).getByText('Cancelled')).toBeInTheDocument()
  })

  it('shows an empty state for no matches', async () => {
    const user = userEvent.setup()
    renderAt('/admin/customers')
    await user.type(await screen.findByLabelText('Search customers'), 'zzz')
    expect(await screen.findByText('No customers found')).toBeInTheDocument()
  })
})
