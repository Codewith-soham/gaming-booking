import { createBrowserRouter } from 'react-router-dom'
import AdminGuard from '../features/admin/AdminGuard'
import AdminLoginPage from '../features/admin/AdminLoginPage'
import DashboardPage from '../features/admin-dashboard/pages/DashboardPage'
import AdminBookingDetailsPage from '../features/admin-bookings/pages/AdminBookingDetailsPage'
import AdminBookingsPage from '../features/admin-bookings/pages/AdminBookingsPage'
import WalkInPage from '../features/admin-bookings/pages/WalkInPage'
import CustomersPage from '../features/customers/pages/CustomersPage'
import SessionsPage from '../features/sessions/pages/SessionsPage'
import StationsPage from '../features/stations/pages/StationsPage'
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
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'bookings', element: <AdminBookingsPage /> },
      { path: 'bookings/new', element: <WalkInPage /> },
      { path: 'bookings/:bookingId', element: <AdminBookingDetailsPage /> },
      { path: 'stations', element: <StationsPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'customers', element: <CustomersPage /> },
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
