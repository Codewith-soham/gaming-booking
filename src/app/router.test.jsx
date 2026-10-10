import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isAdminLoggedIn, loginAdmin, logoutAdmin } from '../features/admin/adminSession'
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

  it('sends signed-out visitors from admin pages to the demo login', async () => {
    logoutAdmin()
    renderAt('/admin/bookings')
    expect(await screen.findByRole('heading', { name: 'GameHub Admin' })).toBeInTheDocument()
    expect(screen.getByText('Prototype only')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as demo staff' })).toBeInTheDocument()
  })

  it('renders the admin layout on /admin/bookings once signed in', async () => {
    loginAdmin()
    renderAt('/admin/bookings')
    expect(await screen.findByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Bookings' })).toBeInTheDocument()
  })

  it('shows not-found for unknown routes', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows not-found inside the admin layout for unknown admin routes', async () => {
    loginAdmin()
    renderAt('/admin/nope')
    expect(await screen.findByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('customer menu', () => {
  it('opens the admin panel or logs out to the login page', async () => {
    const user = userEvent.setup()
    loginAdmin()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: /Demo customer/ }))
    expect(screen.getByRole('menuitem', { name: 'Open admin panel' })).toHaveAttribute(
      'href',
      '/admin',
    )

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
    expect(await screen.findByText('Prototype only')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as demo staff' })).toBeInTheDocument()
    expect(isAdminLoggedIn()).toBe(false)
  })

  it('closes the menu with Escape', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: /Demo customer/ }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
