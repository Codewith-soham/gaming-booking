# Frontend Prototype Test Plan

## 1. Domain/service tests

- Availability excludes `MAINTENANCE` resources.
- Availability excludes `OFFLINE` resources.
- Adjacent bookings are allowed when one ends exactly as the next begins.
- Overlapping bookings for the same resource are rejected.
- Overlapping bookings for different resources are allowed.
- Cancelled bookings do not block availability.
- Invalid interval (`endAt <= startAt`) is rejected.
- A booking outside operating hours is rejected.
- Session extension rejects overlap with a future confirmed booking.
- Session cannot be started twice.
- Unknown IDs return `NOT_FOUND`.
- Reset restores seed data.

## 2. Customer journey tests

- Discovery page renders hub cards.
- Search and filters update results.
- Hub profile opens for a valid slug.
- Booking form validates required fields.
- Availability changes after a successful booking.
- Confirmation displays correct resource, time, price, and reference.
- My bookings displays the new booking.
- Eligible cancellation updates status and availability.
- Empty/error states are visible and understandable.

## 3. Admin journey tests

- Dashboard metrics derive from mock data.
- Booking table search/filter works.
- Walk-in booking creates a shared booking.
- Station maintenance removes resource from bookable results.
- Restoring station allows it to be considered again, subject to reservations.
- Session start/extend/complete updates status consistently.
- Payment status changes do not silently change booking status.
- Resource and pricing edits are reflected in relevant screens.

## 4. Responsive/accessibility checks

- Customer booking is usable at mobile width.
- Admin is usable at desktop and tablet widths.
- Keyboard focus is visible.
- Inputs have labels.
- Dialogs have clear confirm/cancel actions.
- Status is conveyed with text, not only color.
- Images have suitable alt text.
- Reduced-motion preference is respected.

## 5. Demo safety

- All sample customers and booking details are fictional.
- Payment UI says mock/demo.
- QR UI is illustrative and not a secure credential.
- Admin login is labelled demo-only.
- No UI claims that WhatsApp, geolocation, hardware monitoring, or real payments are connected.
