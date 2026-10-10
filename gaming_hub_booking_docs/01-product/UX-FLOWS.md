# UX Flows

## 1. Customer booking flow

1. Customer opens the discovery page.
2. Customer searches or filters hubs.
3. Customer opens a hub profile.
4. Customer selects a branch if the hub has multiple branches.
5. Customer chooses a date and session duration.
6. Customer selects a resource category or specific station.
7. UI requests availability from `availabilityService`.
8. Customer selects a slot.
9. UI displays a summary: hub, branch, station, start/end, duration, price, and payment status/expectation.
10. Customer confirms.
11. `bookingService` validates station state, opening hours, interval, and overlapping bookings.
12. UI displays confirmation and booking reference.
13. Booking appears in customer history and admin bookings.

Failure states: no availability, station unavailable, conflict detected, invalid duration, closed hours, and failed mock operation.

## 2. Admin walk-in flow

1. Staff opens Admin → Bookings → New walk-in.
2. Staff chooses customer (existing or quick-create demo customer).
3. Staff selects resource and duration/start time.
4. Service calculates price and checks availability.
5. Staff records payment status (not a real payment).
6. Staff confirms.
7. Booking is visible in admin list and consumes the relevant interval in customer availability.

## 3. Station maintenance flow

1. Staff opens Live Stations.
2. Staff selects a station.
3. Staff chooses Mark maintenance.
4. UI requests confirmation.
5. Station operational status becomes `MAINTENANCE`.
6. New availability queries exclude the station.
7. Existing bookings must be shown with a warning rather than silently deleted; the prototype may block maintenance if overlapping future confirmed bookings exist, or clearly flag them for operator resolution.

## 4. Session flow

1. Staff opens a confirmed booking.
2. Staff selects Start session.
3. Session becomes `ACTIVE`; station presentation becomes occupied.
4. UI displays elapsed/remaining time based on session timestamps.
5. Before the expected end, show a reminder state in the prototype if the demo clock/workflow supports it.
6. Staff may extend the session only after a conflict check.
7. Staff completes the session.
8. Session becomes `COMPLETED`; booking becomes completed according to the agreed prototype rule; station becomes eligible for future bookings after the occupied interval.

## 5. Cancellation flow

1. Customer or staff opens booking details.
2. UI checks whether cancellation is permitted under prototype rules.
3. Show confirmation dialog.
4. Update booking status to `CANCELLED`.
5. Recompute availability.
6. Do not automatically mark payment `REFUNDED`; payment handling is a separate workflow.

## 6. Route guard behavior in prototype

- Customer routes are publicly accessible except booking history if the prototype uses a simulated demo identity.
- Admin routes may use a simple demo login flag for navigation only.
- Clearly label this as prototype-only; client-side route guards are not security controls.
