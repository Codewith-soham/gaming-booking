# Product Requirements Document (PRD)
## Gaming Hub Booking and Management System

**Version:** 0.1  
**Status:** Initial baseline for UI prototype  
**Primary milestone:** Connected frontend prototype using mock services  
**Frontend stack:** React, Vite, Tailwind CSS

## 1. Product summary

The Gaming Hub Booking and Management System is a multi-tenant product intended to help gaming hubs manage reservations, gaming resources, walk-ins, and sessions through a customer-facing website and an administrative interface. WhatsApp is a planned booking channel that will use the same booking domain and backend services.

The immediate objective is to create a polished, demonstrable UI prototype before implementing production backend integrations and validating workflows with real hub operators.

## 2. Problem statement

Gaming hubs may receive bookings through a mixture of walk-ins, phone calls, messaging apps, and online channels. Without a centralized operational view, staff may have difficulty keeping availability synchronized, tracking active sessions, handling extensions, and understanding revenue and booking status.

The product aims to centralize booking and resource operations in one system, while letting customers use convenient digital channels.

## 3. Product vision

Provide a reusable management platform for gaming hubs of different sizes and configurations, with booking and resource availability as the core domain and web, admin, and future WhatsApp experiences as clients of the same system.

## 4. Goals

### Prototype goals
- Demonstrate the end-to-end customer booking journey.
- Demonstrate the admin's daily booking and station workflows.
- Show online and offline bookings in one shared view.
- Reflect booking changes in shared mock availability.
- Demonstrate station configuration, maintenance states, and basic session lifecycle.
- Establish frontend structure and contracts that can later connect to a backend.

### Longer-term product goals
- Support multiple gaming hubs and potentially multiple branches per hub.
- Prevent conflicting reservations reliably on the server.
- Enable WhatsApp booking and notifications.
- Integrate payment processing when business rules are confirmed.
- Provide accurate operational reporting and session tracking.

## 5. Non-goals for the first prototype

- Production authentication, authorization, or tenant isolation.
- Real payment collection, refunds, or accounting.
- Real WhatsApp Business Platform integration.
- Production QR validation or identity verification.
- Real-time cross-device state synchronization.
- Server-side locking or concurrency guarantees.
- Verified nearby search using device location.
- Hardware/agent integration to detect whether a PC is physically occupied.
- Tax-compliant invoices or financial reporting.

## 6. Users and roles

### Customer
Discovers hubs, views hub information and prices, checks availability, books a resource, and views/cancels eligible bookings.

### Hub staff
Views bookings, creates walk-in/offline bookings, starts or ends sessions, and updates operational station states.

### Hub owner/manager
Uses all staff workflows and manages resources, pricing, opening hours, branches, and high-level reports.

### Platform administrator (future)
Manages tenants, platform configuration, support, and platform-level operations. Excluded from the initial prototype.

## 7. Product surfaces

### Customer website
- Landing/discovery page.
- Hub listing and filters.
- Hub profile and branch details.
- Date, duration, resource/category, and slot selection.
- Booking summary and mock confirmation.
- Booking details and booking history.

### Hub admin panel
- Overview dashboard.
- Booking list/search/filter/detail.
- Walk-in booking creation.
- Live-floor/station grid (simulated status).
- Session management.
- Customer list.
- Resource/station management.
- Pricing and discounts.
- Hub/branch/settings.
- Revenue summary based on mock records.

### Future WhatsApp channel
- Greeting and menu.
- Hub selection.
- Date/time/resource selection.
- Booking confirmation and lookup.
- Cancellation flow and reminders.
- Uses the same backend booking and availability services; no separate booking database.

## 8. Core functional requirements

### FR-01: Hub discovery
Customers can browse sample hubs and view key details such as name, location, price indication, amenities, resource types, and availability summary.

### FR-02: Hub profile
Customers can open a hub profile and inspect its branches (if any), opening hours, resource categories, and pricing.

### FR-03: Availability search
Customers can choose a date, duration, and resource category or specific station. The UI must derive availability from existing mock bookings and station operational state rather than relying on a separately hardcoded “available slots” list.

### FR-04: Booking creation
Customers can select an available option, review the booking summary, and create a mock booking. The system assigns a unique prototype booking reference.

### FR-05: Conflict prevention in prototype
The mock booking service must reject overlapping reservations for the same resource. This is a frontend-demo safeguard only; production conflict prevention must be enforced by the backend/database.

### FR-06: Booking history and details
Customers can view booking details and a list of bookings associated with the selected demo customer. They can request cancellation only for eligible statuses under prototype rules.

### FR-07: Admin booking list
Staff can see bookings for the selected hub/branch, search by booking reference/customer, and filter by date, source, booking status, and payment status.

### FR-08: Offline booking
Staff can create a walk-in booking through the admin interface. The resulting booking must use the same shared mock service as online bookings and affect availability.

### FR-09: Station management
Staff can view stations and their operational states, add/edit demo resources, and mark a station as under maintenance or available. A station under maintenance must not be offered for new bookings.

### FR-10: Session workflow
Staff can start, extend, and complete a simulated session. An extension is allowed only if the resource has no conflicting booking in the extended interval. The UI must display a clear validation result.

### FR-11: Payment status
The UI can display payment status separately from booking status. Payment actions are mock state changes only and must not imply that real money was transferred.

### FR-12: Hub configuration
The admin can edit demo hub details, opening hours, and pricing configuration within the prototype state.

### FR-13: Responsive layout
Core customer flows must work on mobile and desktop. Admin workflows must work on desktop and remain usable on tablet widths.

### FR-14: UI feedback
Actions provide loading, success, validation, empty, and error states where appropriate. Avoid silent failures.

## 9. Business rules for prototype

1. Every booking belongs to one hub and one resource/station in the initial version.
2. A booking has a start timestamp and end timestamp; end must be later than start.
3. Two active reservations cannot overlap on the same resource.
4. Overlap test: `requestedStart < existingEnd && requestedEnd > existingStart`.
5. A station in `MAINTENANCE` or `OFFLINE` cannot be booked.
6. Booking source is one of `WEBSITE`, `WHATSAPP`, or `ADMIN`.
7. Booking status and payment status are independent.
8. Only eligible future bookings can be cancelled in the prototype; document the exact eligibility in the UI.
9. Session extension must check conflicts before changing the expected end time.
10. The hub's operating hours and resource availability constrain the available slots.
11. The prototype may use fixed sample data and local persistence, but must clearly identify that data as demo data.
12. Do not treat `RESERVED` as the same thing as `OCCUPIED`; reservation and physical/active use are distinct.

## 10. State definitions

### Booking status
- `PENDING` — created but not yet confirmed.
- `CONFIRMED` — reservation accepted.
- `CANCELLED` — reservation cancelled.
- `COMPLETED` — booking/session finished.
- `NO_SHOW` — customer did not arrive (future or simulated admin action).

### Payment status
- `UNPAID`
- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED` (display-only/future behavior unless a refund flow is explicitly mocked)

### Session status
- `NOT_STARTED`
- `ACTIVE`
- `COMPLETED`
- `EXTENDED`
- `CANCELLED`

### Station operational status
- `AVAILABLE`
- `MAINTENANCE`
- `OFFLINE`

Derived presentation states such as `RESERVED` and `OCCUPIED` should be computed from bookings/session data plus operational status, rather than stored as a competing source of truth. If the UI uses them as display labels, explain the derivation.

## 11. UX requirements

- Use a premium dark visual direction with restrained violet accent.
- Customer website prioritizes discovery, imagery, and a low-friction booking flow.
- Admin panel prioritizes operational clarity, quick actions, dense but readable data, and strong status distinctions.
- Navigation must be consistent and obvious.
- Forms should validate required fields and time ranges.
- Confirm destructive or consequential actions such as cancellation and completing a session.
- Provide empty states and sample/demo data indicators.
- Avoid excessive neon, low-contrast text, and decorative motion that slows staff workflows.

## 12. Success criteria

Prototype is considered ready for operator demos when:
- A customer can complete a mock booking.
- The admin can see the booking immediately in the shared UI state.
- An admin walk-in booking affects the same availability calculation.
- A conflicting booking is rejected by the mock service.
- Maintenance prevents new bookings for the affected resource.
- A session can be started, extended (when conflict-free), and completed.
- Payment state is visually separate from booking state.
- Main flows work at desktop and mobile/tablet widths.
- No core interaction is represented as working if it is only a static decoration.

## 13. Assumptions to validate

- Customers will book a specific station rather than only a category.
- Some hubs have branches; the data model should allow it.
- Walk-ins are common enough to need a first-class workflow.
- Staff will use the admin panel during live operations.
- A QR code can support session check-in, but its exact role needs operator validation.
- Customers may pay before or after play; payment timing is unresolved.
- Session extensions are needed and can be approved based on future availability.
- WhatsApp is a commercially useful channel for the target hubs.
- Hub owners want revenue summaries, but exact accounting definitions are not yet confirmed.

## 14. Dependencies and risks

- Real-time availability and conflict prevention require a backend.
- WhatsApp integration depends on WhatsApp Business Platform setup, templates/policy requirements, and webhook handling.
- Payments depend on provider choice, settlement/refund rules, and reconciliation.
- Location search depends on location permissions and a location/geocoding strategy.
- “Live PC status” requires staff updates or a future monitoring integration; bookings alone cannot prove physical PC usage.
- Business workflows may differ by hub, so avoid hardcoding policies into UI components.

## 15. Release outline

- Prototype 0.1: Customer and admin UI using mock data.
- Pilot 0.2: Backend, real persistence, tenant isolation, booking concurrency safeguards, operator-validated rules.
- Pilot 0.3: WhatsApp and payment integrations after provider and workflow decisions.
- Later: analytics, memberships, packages, multi-branch administration, and integrations.
