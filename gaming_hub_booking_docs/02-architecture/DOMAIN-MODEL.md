# Domain Model — Initial Prototype

## 1. Entity relationships

```text
GamingHub 1 --- * Branch
GamingHub 1 --- * Resource
Branch 1 --- * Resource
Customer 1 --- * Booking
Resource 1 --- * Booking
Booking 1 --- 0..1 Session (initial model)
GamingHub 1 --- * PricingRule (conceptual)
```

For the first demo, a hub may be represented as one branch, but retain `branchId` in the model if multi-branch support is an intended product capability. Validate the complexity with operators before finalizing production schema.

## 2. GamingHub

- `id`
- `name`
- `slug`
- `description`
- `address`
- `city`
- `latitude` / `longitude` (optional demo fields; not a real geolocation feature)
- `phone`
- `imageUrls`
- `amenities[]`
- `branchIds[]`
- `openingHours`
- `timezone`
- `isPublished`

## 3. Branch

- `id`
- `hubId`
- `name`
- `address`
- `timezone`
- `openingHours`
- `isActive`

## 4. Resource

Represents an individually bookable item, such as PC-01, PS5-02, or Racing Simulator-01.

- `id`
- `hubId`
- `branchId`
- `name`
- `type` (`PC`, `PS5`, `XBOX`, `RACING_SIMULATOR`, `VR`, `OTHER`)
- `specifications` (optional display metadata)
- `hourlyRate` (prototype default only; future pricing rules may be richer)
- `operationalStatus` (`AVAILABLE`, `MAINTENANCE`, `OFFLINE`)
- `isActive`

`AVAILABLE` means operationally eligible, not necessarily free of reservations at every moment. Reservation/occupancy is time-dependent and should be derived.

## 5. Customer

- `id`
- `name`
- `phone`
- `email` (optional)
- `createdAt`

The prototype should use fictional sample data only.

## 6. Booking

- `id`
- `reference`
- `hubId`
- `branchId`
- `customerId`
- `resourceId`
- `startAt`
- `endAt`
- `source` (`WEBSITE`, `WHATSAPP`, `ADMIN`)
- `status` (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`)
- `paymentStatus` (`UNPAID`, `PENDING`, `PAID`, `FAILED`, `REFUNDED`)
- `priceBreakdown`
- `totalPrice`
- `notes` (optional)
- `createdAt`
- `updatedAt`

For prototype purposes, all bookings reserve a specific resource. If operators prefer category-based booking and assignment later, that can be designed as a separate workflow.

## 7. Session

- `id`
- `bookingId`
- `startedAt`
- `expectedEndAt`
- `actualEndAt`
- `status` (`NOT_STARTED`, `ACTIVE`, `COMPLETED`, `CANCELLED`)
- `extensionCount`

A session is the operational play period, not merely the planned booking interval. A production model must define what happens if a session starts late, ends early, or exceeds the reserved time.

## 8. QR concept

In the prototype, QR may encode a demo booking reference or point to a demo route. It must not contain secrets or be treated as a secure credential. Production QR check-in requires server-side validation, expiry/replay handling, and an explicit policy for who may start a session.

## 9. Status derivation

- `MAINTENANCE` / `OFFLINE`: station is not bookable.
- `RESERVED`: a confirmed booking exists for the viewed time and the session has not started.
- `OCCUPIED`: an active session is in progress.
- `AVAILABLE`: station is operational and no conflicting reservation/session blocks the queried interval.

Do not store `RESERVED` or `OCCUPIED` as an independent status unless a future hardware/operations design establishes a clear source of truth.
