# Implementation Plan

## Milestone 0 — Repository foundation
**Goal:** project runs and navigation/theme foundations are stable.

Tasks:
- Create React + Vite app.
- Configure Tailwind CSS using the current official setup for the selected Tailwind version.
- Add React Router and Lucide icons.
- Create global theme tokens and font setup.
- Create `CustomerLayout`, `AdminLayout`, router, and not-found page.
- Add responsive sidebar/navigation primitives.
- Add lint/format scripts if desired.

Acceptance:
- App starts with the documented command.
- Customer and admin routes render the correct layouts.
- Unknown routes show a not-found page.
- No route is a dead-end.

## Milestone 1 — Shared mock domain
**Goal:** define the data and service behavior before building all pages.

Tasks:
- Add fictional hubs, branches, resources, customers, bookings, sessions.
- Implement service functions and consistent error shape.
- Implement availability calculation and overlap validation.
- Add reset-demo-data behavior.
- Decide shared state mechanism (Context + reducer is sufficient initially).

Acceptance:
- Unit tests cover overlap, maintenance exclusion, cancelled booking behavior, and invalid time ranges.
- Customer/admin views consume services, not raw mutable arrays.

## Milestone 2 — Customer discovery
**Goal:** customer can discover a hub.

Tasks:
- Landing page and search UI.
- Hub cards and filters.
- Hub profile and pricing.
- Empty/error states.

Acceptance:
- Hub card opens the correct detail page.
- Search/filter controls work with mock data.
- Responsive layouts behave correctly.

## Milestone 3 — Customer booking
**Goal:** end-to-end mock booking.

Tasks:
- Date/duration/resource selection.
- Availability display.
- Booking summary and price calculation.
- Confirmation and booking details.
- My bookings and cancellation.

Acceptance:
- Successful booking appears in admin.
- Conflicting booking is rejected.
- Cancelled booking frees its interval in the mock availability calculation.

## Milestone 4 — Admin operations
**Goal:** staff can operate the demo hub.

Tasks:
- Dashboard metrics and upcoming bookings.
- Booking list, search/filter and detail.
- Create walk-in booking.
- Station grid and maintenance actions.
- Session start/extend/complete.
- Customers and payment-status display.

Acceptance:
- Admin-created booking shares the same state as customer bookings.
- Maintenance blocks availability.
- Session extension checks conflicts.
- Payment status and booking status are distinct.

## Milestone 5 — Configuration and demo polish
**Goal:** owner can understand how the hub is configured.

Tasks:
- Resource CRUD-like mock interactions.
- Pricing settings.
- Opening hours and branch settings.
- Revenue chart based on clearly labeled mock data.
- Loading/empty/error states and responsive QA.
- Demo reset.

Acceptance:
- Changes are reflected in relevant screens.
- No prominent button is inert without a clear disabled/placeholder explanation.
- Demo data can be reset reliably.

## Milestone 6 — Operator feedback
**Goal:** use the prototype to validate requirements.

Tasks:
- Prepare demo script.
- Demonstrate customer booking and admin operations.
- Record feedback separately from assumptions.
- Update PRD, domain model, and open questions.
- Freeze backend requirements only after high-impact workflow questions are answered.

## Suggested build order

1. Router/layout/theme.
2. Domain types/constants and seed data.
3. Mock services and tests.
4. Customer discovery/profile.
5. Booking flow.
6. Admin overview/bookings.
7. Station management.
8. Session workflows.
9. Pricing/settings/revenue.
10. Polish and operator demo.

Avoid building all pages visually first with disconnected hardcoded data. Build one vertical slice at a time.
