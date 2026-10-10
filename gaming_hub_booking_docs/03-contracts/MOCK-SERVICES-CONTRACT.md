# Mock Services Contract

This document defines how UI features should interact with the prototype domain. Services are local mock implementations now and can later be replaced by API clients.

## General conventions

- Use async service methods even if the mock implementation returns quickly; this approximates API behavior.
- Never mutate exported mock arrays directly.
- Use stable entity IDs.
- Keep domain validation in service functions, not React components.
- Errors should expose stable `code` and readable `message`.
- Shared state must be updated after successful mutations.
- A reset function should restore the original demo data.

## `hubService`

- `listHubs(filters?)`
- `getHubBySlug(slug)`
- `getHubById(hubId)`
- `listBranches(hubId)`

## `resourceService`

- `listResources({ hubId, branchId, type, status })`
- `getResourceById(resourceId)`
- `createResource(input)`
- `updateResource(resourceId, changes)`
- `setOperationalStatus(resourceId, status)`

Validation: resource must belong to the selected hub/branch; maintenance/offline resources are excluded from availability.

## `availabilityService`

- `getAvailability({ hubId, branchId, date, durationMinutes, resourceType?, resourceId? })`

Expected result should include candidate resources and available intervals/slots. Availability must be calculated from:
1. hub/branch opening hours,
2. resource operational status,
3. existing non-cancelled bookings,
4. active sessions where applicable,
5. requested duration and selected date.

The UI must not treat a stale availability response as final authority. `bookingService.createBooking` must revalidate before creating a booking.

## `bookingService`

- `listBookings(filters?)`
- `getBookingById(bookingId)`
- `createBooking(input)`
- `cancelBooking(bookingId, actor)`
- `updateBookingPaymentStatus(bookingId, status)`

`createBooking` must validate:
- required IDs exist and relationships match,
- `endAt > startAt`,
- requested interval falls within opening hours,
- resource is operational,
- no overlapping booking/session exists for the resource,
- price is calculated by a single pricing function.

Overlap formula:
`requestedStart < existingEnd && requestedEnd > existingStart`

Cancelled bookings do not block availability. Completed booking intervals remain historical and should not block new, non-overlapping future intervals.

## `sessionService`

- `startSession(bookingId)`
- `extendSession(bookingId, additionalMinutes)`
- `completeSession(bookingId)`
- `listSessions(filters?)`

`startSession` should require an eligible confirmed booking and prevent duplicate active sessions. `extendSession` must check for conflicts before changing `expectedEndAt`. `completeSession` records `actualEndAt` and updates related booking/session state consistently.

## `pricingService`

- `calculatePrice({ resource, startAt, endAt, pricingRules? })`
- `getPricingForHub(hubId, branchId?)`

Use integer minor currency units in production APIs to avoid floating-point monetary errors. For the prototype, consistently represent INR as integer rupees if all sample amounts are whole rupees. Clearly label all values as sample data.

## Error shape

```js
{
  code: "BOOKING_CONFLICT",
  message: "This station is no longer available for the selected time."
}
```

Suggested codes:
- `NOT_FOUND`
- `INVALID_INPUT`
- `INVALID_TIME_RANGE`
- `OUTSIDE_OPERATING_HOURS`
- `RESOURCE_UNAVAILABLE`
- `RESOURCE_UNDER_MAINTENANCE`
- `BOOKING_CONFLICT`
- `BOOKING_NOT_CANCELLABLE`
- `SESSION_ALREADY_ACTIVE`
- `SESSION_EXTENSION_CONFLICT`
- `INVALID_STATUS_TRANSITION`

## Prototype limitations

These services run in one browser context and cannot guarantee cross-user concurrency or authoritative state. Production must revalidate availability and booking creation on the server, with appropriate transaction/locking strategy and database constraints where possible.
