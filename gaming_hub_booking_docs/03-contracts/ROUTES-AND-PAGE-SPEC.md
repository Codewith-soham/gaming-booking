# Routes and Page Specifications

## Customer layout
- Header: brand, discover/search, my bookings, account/demo identity.
- Main content: responsive, max-width layout with consistent gutters.
- Footer: contact/help and demo disclaimer where appropriate.

### `/`
**Page:** Discover hubs  
**Required UI:** hero/search, location input, filters, featured hubs, hub cards, empty state.

### `/hubs/:hubSlug`
**Page:** Hub details  
**Required UI:** hero/gallery, address, opening hours, amenities, resource categories, prices, branch selector, Book Now.

### `/book/:hubId`
**Page:** Booking flow  
**Required UI:** step indicator, date, duration, resource type/resource, available slots, price breakdown, validation, confirmation. Preserve selections when moving between steps.

### `/bookings/:bookingId`
**Page:** Booking details  
**Required UI:** reference, hub, resource, date/time, status, payment status, QR placeholder, cancel action if eligible.

### `/my-bookings`
**Page:** Booking history  
**Required UI:** upcoming/past/cancelled filters, booking cards or table, details link, empty state.

## Admin layout
- Sidebar with active route state.
- Top bar with selected branch, notifications placeholder, profile/demo menu.
- Main page header with title, description, primary action.
- Consistent table/filter patterns.

### `/admin/login`
Demo-only login. No production credential handling.

### `/admin`
Dashboard: KPI cards, booking activity, upcoming bookings, station availability summary, quick actions.

### `/admin/bookings`
Search, date filter, status/source/payment filters, booking table, details drawer/page, create walk-in action.

### `/admin/stations`
Station grid and filters by type/status. Station detail panel; maintenance/offline/restore actions.

### `/admin/sessions`
Active/upcoming/completed tabs, timer display, start/extend/complete actions with confirmation and validation.

### `/admin/customers`
Searchable fictional customer list and booking history summary.

### `/admin/revenue`
Mock revenue cards and chart; labels must say demo/sample data. Definitions for revenue, refunds, and outstanding balances remain subject to operator validation.

### `/admin/resources`
Create/edit/deactivate resources; validate required name, type, branch, and rate.

### `/admin/pricing`
Configure basic hourly rates and simple discounts. Keep complex peak/off-peak and packages out of the first milestone unless discovery confirms need.

### `/admin/settings`
Hub profile, opening hours, branch settings, and demo data reset.

## Common UI states
- Loading/skeleton
- Empty
- Validation error
- Operation failure
- Success feedback
- Disabled/ineligible action with explanation
- Confirmation dialog for cancellation, session completion, and maintenance changes
