import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Providers from '../../app/providers'
import { routes } from '../../app/router'
import { createBooking } from '../../services/bookingService'
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
}

const cardTitles = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)
const search = () => screen.getByLabelText(/Search by hub name/)

describe('Discover page', () => {
  it('lists every published hub as a card linking to its profile', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'Pixel Arena' })
    expect(cardTitles()).toEqual(['Pixel Arena', 'Nova Gaming Lounge', 'Rift Racing & VR'])
    expect(screen.getByRole('link', { name: /Nova Gaming Lounge/ })).toHaveAttribute(
      'href',
      '/hubs/nova-gaming-lounge',
    )
  })

  it('filters by search text and shows an empty state with a clear action', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByRole('heading', { name: 'Pixel Arena' })

    await user.type(search(), 'mumbai')
    await waitFor(() => expect(cardTitles()).toEqual(['Nova Gaming Lounge']))

    await user.clear(search())
    await user.type(search(), 'zzz')
    expect(await screen.findByText('No hubs match your search')).toBeInTheDocument()

    const main = within(screen.getByRole('main'))
    await user.click(main.getAllByRole('button', { name: 'Clear filters' })[0])
    await waitFor(() => expect(cardTitles()).toHaveLength(3))
  })

  it('filters by station type and price', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByRole('heading', { name: 'Pixel Arena' })

    await user.selectOptions(screen.getByLabelText('Station type'), 'VR')
    await waitFor(() => expect(cardTitles()).toEqual(['Nova Gaming Lounge', 'Rift Racing & VR']))

    await user.selectOptions(screen.getByLabelText('Starting price'), '80')
    expect(await screen.findByText('No hubs match your search')).toBeInTheDocument()
  })

  it('restores filters from the URL', async () => {
    renderAt('/?city=Pune')
    await waitFor(() => expect(cardTitles()).toEqual(['Pixel Arena']))
    expect(screen.getByLabelText('City')).toHaveValue('Pune')
  })

  it('updates the free-now count when a booking changes availability', async () => {
    renderAt('/')
    const card = (await screen.findByRole('link', { name: /Pixel Arena/ })).closest('a')
    expect(within(card).getByText('10 of 14 free now')).toBeInTheDocument()

    await createBooking(
      bookingInput({
        source: 'ADMIN',
        resourceId: 'res_kp_pc04',
        startAt: at('12:10').toISOString(),
        endAt: at('13:10').toISOString(),
      }),
    )
    // A booking covering "now" makes PC-04 reserved, so it is no longer free
    expect(await within(card).findByText('9 of 14 free now')).toBeInTheDocument()
  })
})

describe('Hub details page', () => {
  it('shows profile, prices, hours, amenities and a Book now link', async () => {
    renderAt('/hubs/nova-gaming-lounge')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nova Gaming Lounge' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Stations and prices')).toBeInTheDocument()
    expect(screen.getByText('Mon-Sun')).toBeInTheDocument()
    expect(screen.getByText('11:00 AM - 11:30 PM')).toBeInTheDocument()
    expect(screen.getByText('Cafe')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Book/ })[0]).toHaveAttribute(
      'href',
      '/book/hub_nova?branch=br_nova',
    )
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument()
  })

  it('lets customers switch branches on a multi-branch hub', async () => {
    const user = userEvent.setup()
    renderAt('/hubs/pixel-arena')
    await screen.findByRole('heading', { level: 1, name: 'Pixel Arena' })
    expect(screen.getByText('10:00 AM - 11:00 PM')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Branch'), 'br_baner')
    expect(await screen.findByText('11:00 AM - 11:00 PM')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Book/ })[0]).toHaveAttribute(
      'href',
      '/book/hub_pixel?branch=br_baner',
    )
  })

  it('shows a not-found state for an unknown slug', async () => {
    renderAt('/hubs/nope')
    expect(await screen.findByText('Hub not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse hubs' })).toHaveAttribute('href', '/')
  })
})
