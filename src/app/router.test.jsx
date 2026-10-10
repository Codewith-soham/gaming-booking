import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setupDomain, teardownDomain } from '../test/helpers'
import { routes } from './router'
import Providers from './providers'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('routing', () => {
  it('renders the customer layout on /', async () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find a gaming hub')
    expect(await screen.findByRole('heading', { name: 'Pixel Arena' })).toBeInTheDocument()
  })

  it('renders the admin layout on /admin/bookings', () => {
    renderAt('/admin/bookings')
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument()
  })

  it('shows not-found for unknown routes', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows not-found inside the admin layout for unknown admin routes', () => {
    renderAt('/admin/nope')
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
