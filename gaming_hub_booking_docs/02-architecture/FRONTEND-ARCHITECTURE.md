# Frontend Architecture

## 1. Stack

- React
- Vite
- Tailwind CSS
- React Router
- Lucide React icons
- Chart library only if a real chart improves the admin demo
- Optional lightweight form validation library if forms become complex

Choose library versions during project setup and keep them pinned in the lockfile. Do not add libraries before there is a concrete need.

## 2. Architectural principles

1. Feature-oriented organization.
2. Pages compose feature components; pages should not contain domain rules.
3. Services own mock data access and business operations.
4. Availability is derived from bookings, station status, and opening hours.
5. Shared components own visual patterns, not domain decisions.
6. Separate booking status, payment status, session status, and station operational status.
7. No direct mutation of exported mock data; use service methods/state.
8. Keep the mock service interface similar to a future API interface.
9. Use stable IDs, not array indexes, for entity identity.
10. Clearly label simulated behavior.

## 3. Suggested structure

```text
src/
  app/
    App.jsx
    router.jsx
    providers.jsx
  layouts/
    CustomerLayout.jsx
    AdminLayout.jsx
  components/
    ui/
    booking/
    stations/
    hubs/
    admin/
  features/
    discovery/pages/
    hub-details/pages/
    booking/pages/
    my-bookings/pages/
    admin-dashboard/pages/
    admin-bookings/pages/
    stations/pages/
    sessions/pages/
    customers/pages/
    revenue/pages/
    resources/pages/
    pricing/pages/
    settings/pages/
  services/
    hubService.js
    availabilityService.js
    bookingService.js
    sessionService.js
    pricingService.js
    customerService.js
  data/
    hubs.js
    resources.js
    bookings.js
    sessions.js
    customers.js
  hooks/
  utils/
  styles/
    index.css
  main.jsx
```

Create directories as the corresponding phase starts; avoid empty scaffolding for every future feature.

## 4. State management

Start with React state and Context only where shared state is needed. A small reducer/context for prototype domain state is reasonable because customer and admin pages must reflect the same bookings and resource changes.

Do not introduce Redux or another global state library without a demonstrated need.

For demo persistence, `localStorage` may be used behind a repository/service adapter. Include a reset-demo-data action so demonstrations can return to a known baseline. Treat browser storage as untrusted and prototype-only.

## 5. Routing

Use a customer layout and an admin layout. Use nested routes for admin pages so the sidebar persists during navigation. Add a not-found page and sensible loading/empty/error states.

## 6. Data flow

```text
Route page
  -> feature component
  -> hook/context if shared state is required
  -> service method
  -> mock repository/data
  -> updated shared state
  -> rerender
```

Future production flow:

```text
Route page -> feature/hook -> service/API client -> backend API
```

## 7. Error handling

Service operations should return a consistent success/error result or throw typed errors handled by the UI layer. Prefer stable error codes such as:
- `RESOURCE_NOT_AVAILABLE`
- `BOOKING_CONFLICT`
- `OUTSIDE_OPERATING_HOURS`
- `INVALID_TIME_RANGE`
- `BOOKING_NOT_CANCELLABLE`
- `RESOURCE_UNDER_MAINTENANCE`
- `SESSION_EXTENSION_CONFLICT`
- `NOT_FOUND`

Avoid showing raw stack traces or implementation details to users.
