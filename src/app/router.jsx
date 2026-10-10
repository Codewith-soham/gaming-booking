import { createBrowserRouter } from 'react-router-dom'
import BookingPage from '../features/booking/pages/BookingPage'
import DiscoverPage from '../features/discovery/pages/DiscoverPage'
import HubDetailsPage from '../features/hub-details/pages/HubDetailsPage'
import BookingDetailsPage from '../features/my-bookings/pages/BookingDetailsPage'
import MyBookingsPage from '../features/my-bookings/pages/MyBookingsPage'
import NotFoundPage from '../features/placeholder/NotFoundPage'
import PlaceholderPage from '../features/placeholder/PlaceholderPage'
import AdminLayout from '../layouts/AdminLayout'
import CustomerLayout from '../layouts/CustomerLayout'

// Each route points at a placeholder until its milestone replaces the element.
function page(title, description, milestone, extra = {}) {
  return (
    <PlaceholderPage title={title} description={description} milestone={milestone} {...extra} />
  )
}

const adminBack = { backTo: '/admin', backLabel: 'Back to dashboard' }

export const routes = [
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <DiscoverPage /> },
      { path: '/hubs/:hubSlug', element: <HubDetailsPage /> },
      { path: '/book/:hubId', element: <BookingPage /> },
      { path: '/bookings/:bookingId', element: <BookingDetailsPage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: page('Admin login', 'Demo-only login arrives in M4.', 'M4', {
      backTo: '/',
      backLabel: 'Back to customer site',
    }),
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: page('Dashboard', 'KPIs and activity arrive in M4.', 'M4', adminBack),
      },
      {
        path: 'bookings',
        element: page('Bookings', 'Booking management arrives in M4.', 'M4', adminBack),
      },
      {
        path: 'stations',
        element: page('Live stations', 'Station grid arrives in M4.', 'M4', adminBack),
      },
      {
        path: 'sessions',
        element: page('Sessions', 'Session management arrives in M4.', 'M4', adminBack),
      },
      {
        path: 'customers',
        element: page('Customers', 'Customer list arrives in M4.', 'M4', adminBack),
      },
      {
        path: 'revenue',
        element: page('Revenue', 'Demo revenue summary arrives in M5.', 'M5', adminBack),
      },
      {
        path: 'resources',
        element: page('Resources', 'Resource management arrives in M5.', 'M5', adminBack),
      },
      {
        path: 'pricing',
        element: page('Pricing', 'Pricing configuration arrives in M5.', 'M5', adminBack),
      },
      {
        path: 'settings',
        element: page('Settings', 'Hub settings and demo reset arrive in M5.', 'M5', adminBack),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
