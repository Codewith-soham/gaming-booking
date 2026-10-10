# Task Breakdown — Gaming Hub Booking Prototype

Source: documentation pack in this folder (PRD, UX-FLOWS, FRONTEND-ARCHITECTURE, DOMAIN-MODEL, MOCK-SERVICES-CONTRACT, ROUTES-AND-PAGE-SPEC, UI-DESIGN-SYSTEM, IMPLEMENTATION-PLAN, TEST-PLAN, ADR-001, OPEN-QUESTIONS).

**Scope:** frontend-first prototype (React + Vite + Tailwind + React Router + Lucide) with shared mock services. No real auth, payments, WhatsApp, geolocation, backend, or hardware monitoring.

**How to use:** work top to bottom, one vertical slice at a time. Do not build pages against hardcoded data disconnected from services. Tick `[ ]` → `[x]` when acceptance criteria are met.

## Global rules (apply to every task)

- Pages compose feature components; **domain rules live only in services**, never in components.
- Never mutate exported seed arrays; go through services/state.
- Service methods are `async`; errors are `{ code, message }` with stable codes.
- Overlap test: `requestedStart < existingEnd && requestedEnd > existingStart`. Adjacent (end == start) is allowed.
- Booking status, payment status, session status, and station operational status are **separate**. `RESERVED` / `OCCUPIED` are **derived**, never stored.
- All sample data is fictional and labeled demo; payments/QR/login are labeled mock/demo.
- Status is always text + icon, never color alone. Respect `prefers-reduced-motion`.
- Stable IDs, not array indexes. Add only libraries with a concrete need.

---

## M0 — Repository foundation

- [x] **T0.1 Scaffold app** — Create React + Vite app at repo root; pin versions via lockfile; scripts `dev`, `build`, `preview`, `lint`, `test`.
  *Accept:* documented command starts the app.
- [x] **T0.2 Tailwind + theme tokens** — Configure Tailwind per its current official setup. Define tokens: bg `#0B0D12`, surface `#171A23`, elevated `#1E2230`, border `#2B3040`, text `#F3F4F6`, secondary `#9CA3AF`, accent `#A78BFA`, hover `#8B5CF6`; semantic status colors; font setup; tabular-nums utility; visible focus ring; reduced-motion handling. File: `src/styles/index.css`, Tailwind config.
  *Accept:* tokens usable as utilities; contrast adequate.
- [x] **T0.3 Router + layouts** — `app/App.jsx`, `router.jsx`, `providers.jsx`; `CustomerLayout` (header: brand, discover, my bookings, demo identity; footer with demo disclaimer) and `AdminLayout` (persistent responsive sidebar with active state, top bar: branch selector, notification placeholder, demo profile menu; page header pattern). Nested admin routes. `NotFound` page. Placeholder pages for every route in the route table.
  *Accept:* customer and admin routes render correct layouts; unknown route shows not-found; no dead-end route.
- [x] **T0.4 UI primitives** (`components/ui/`) — Button (primary/secondary/ghost/destructive/disabled), Input/Select/Textarea with label+helper+error, Badge (label + icon), Card, Table (responsive overflow / card fallback), Dialog (keyboard accessible, focus trap, Esc, explicit confirm/cancel labels), Toast, Skeleton, EmptyState, ErrorState, Tabs, DemoBanner/“Demo data” tag.
  *Accept:* each primitive keyboard-operable and labeled.
- [x] **T0.5 Tooling** — ESLint + Prettier (optional per docs), Vitest + Testing Library setup.
  *Accept:* `npm test` runs a sample test.

---

## M1 — Shared mock domain (build before any feature page)

- [x] **T1.1 Constants & error codes** — `utils/constants.js`: enums for resource type (`PC, PS5, XBOX, RACING_SIMULATOR, VR, OTHER`), operational status (`AVAILABLE, MAINTENANCE, OFFLINE`), booking status (`PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW`), payment status (`UNPAID, PENDING, PAID, FAILED, REFUNDED`), session status (`NOT_STARTED, ACTIVE, COMPLETED, EXTENDED, CANCELLED`), booking source (`WEBSITE, WHATSAPP, ADMIN`). Error codes: `NOT_FOUND, INVALID_INPUT, INVALID_TIME_RANGE, OUTSIDE_OPERATING_HOURS, RESOURCE_UNAVAILABLE, RESOURCE_UNDER_MAINTENANCE, BOOKING_CONFLICT, BOOKING_NOT_CANCELLABLE, SESSION_ALREADY_ACTIVE, SESSION_EXTENSION_CONFLICT, INVALID_STATUS_TRANSITION` (+ architecture-doc `RESOURCE_NOT_AVAILABLE` reconciled with `RESOURCE_UNAVAILABLE`). `ServiceError` helper.
- [x] **T1.2 Seed data** (`data/`) — Fictional hubs (2–3, at least one multi-branch, with `branchId` on all entities), branches, resources of mixed types and statuses, customers, bookings (mixed source/status/payment, past/today/future, at least one adjacent pair), sessions (one active). Prices in whole INR rupees.
  *Accept:* every entity matches DOMAIN-MODEL fields; all marked demo.
- [x] **T1.3 Repository adapter** — localStorage-backed store behind an adapter (seed → load → persist); `resetDemoData()`; tolerate missing/corrupt storage.
  *Accept:* reset restores seed exactly.
- [x] **T1.4 Shared state provider** — Context + reducer exposing entities and mutation dispatch; hooks (`useHubs`, `useBookings`, `useResources`, …). Customer and admin share one store.
  *Accept:* a mutation in one view appears in the other without reload.
- [x] **T1.5 `hubService` & `resourceService`** — `listHubs(filters?)`, `getHubBySlug`, `getHubById`, `listBranches`; `listResources({hubId,branchId,type,status})`, `getResourceById`, `createResource`, `updateResource`, `setOperationalStatus`. Validate hub/branch relationships.
- [x] **T1.6 `pricingService`** — `calculatePrice({resource,startAt,endAt,pricingRules?})` (single pricing function, hourly rate + simple discount, returns breakdown), `getPricingForHub(hubId,branchId?)`. Integer rupees.
- [x] **T1.7 `availabilityService`** — `getAvailability({hubId,branchId,date,durationMinutes,resourceType?,resourceId?})` derived from: opening hours, operational status, non-cancelled bookings, active sessions, duration/date. Returns candidate resources + slots. Slot increment is a config constant (resolves open question).
- [x] **T1.8 `bookingService`** — `listBookings(filters?)`, `getBookingById`, `createBooking`, `cancelBooking(id, actor)`, `updateBookingPaymentStatus`. `createBooking` revalidates: IDs/relationships, `end > start`, inside opening hours, resource operational, no overlap, price via pricingService; generates unique reference; sets source. Cancel eligibility rule (future + status `PENDING`/`CONFIRMED`; cutoff constant) with a human-readable reason. Cancel does **not** change payment status; payment changes do **not** change booking status.
- [x] **T1.9 `sessionService`** — `startSession` (confirmed booking only, no duplicate active), `extendSession(bookingId, additionalMinutes)` (conflict check before changing `expectedEndAt`, increments `extensionCount`), `completeSession` (sets `actualEndAt`, booking→`COMPLETED`), `listSessions(filters?)`.
- [x] **T1.10 `customerService`** — list/search customers, get with booking history, quick-create demo customer, demo “current customer” identity.
- [x] **T1.11 Derived station status util** — `deriveStationStatus(resource, bookings, sessions, atTime)` → `MAINTENANCE|OFFLINE|OCCUPIED|RESERVED|AVAILABLE`; document derivation in UI tooltip/legend.
- [x] **T1.12 Unit tests** (TEST-PLAN §1): maintenance excluded; offline excluded; adjacent bookings allowed; same-resource overlap rejected; different-resource overlap allowed; cancelled doesn’t block; `end <= start` rejected; outside hours rejected; extension vs future booking rejected; session can’t start twice; unknown IDs → `NOT_FOUND`; reset restores seed.
  *Accept (M1):* tests pass; no view reads raw mutable arrays.

---

> **M1 implementation notes**
> - T1.4: shared state is an external store (`src/services/store.js`) read by `useSyncExternalStore` hooks (`useServiceQuery`, `useStoreVersion`) instead of Context + reducer. Services stay React-free and testable; views still re-render on any change.
> - Policy constants live in `src/utils/constants.js` (`BOOKING_RULES`): 30-min slots, 30 min–4 h, customer cancel cutoff 2 h (staff exempt), session may start 15 min early, past-start tolerance 5 min (customers) / 30 min (admin).
> - Maintenance/offline/deactivate is **blocked** while upcoming or running bookings exist (`BOOKING_CONFLICT` lists them).
> - Seed times are relative to "now" and re-based when the day changes (so reset/new-day wipes local edits).
> - Extensions update both the session and the booking end/price; completing early frees the unused part of the slot.

---

## M2 — Customer discovery (FR-01, FR-02)

- [x] **T2.1 Landing `/`** — hero/search, location text input (labeled demo, no real geolocation), filters (resource type, amenities, price), featured hubs, hub cards (name, location, price indication, amenities, resource types, availability summary), empty state, loading skeleton.
- [x] **T2.2 Hub details `/hubs/:hubSlug`** — gallery/hero with alt text, address, opening hours, amenities, resource categories with prices, branch selector (if >1 branch), Book Now → `/book/:hubId` (carry branch). Invalid slug → not-found/empty state.
  *Accept (M2):* card opens correct detail page; filters work on mock data; mobile and desktop layouts correct.

---

## M3 — Customer booking (FR-03 – FR-06)

- [x] **T3.1 Booking flow `/book/:hubId`** — step indicator; steps: date, duration, resource type/specific station, slot selection, summary (hub, branch, station, start/end, duration, price breakdown, payment expectation labeled mock). Selections preserved when moving between steps and after validation errors. Demo customer details form with validation.
- [x] **T3.2 Availability display** — slots fetched from `availabilityService`; states: loading, none available, closed hours, invalid duration; refetch after any change.
- [x] **T3.3 Confirm & error handling** — call `createBooking` (revalidates); on `BOOKING_CONFLICT` etc. show readable message and refresh availability; success → confirmation with reference.
- [x] **T3.4 Booking details `/bookings/:bookingId`** — reference, hub, resource, date/time, booking status, payment status (separate badges), QR placeholder (illustrative, not a credential), cancel action with eligibility explanation and confirm dialog.
- [x] **T3.5 My bookings `/my-bookings`** — upcoming/past/cancelled filters, cards/table, details link, empty state; demo identity indicated.
  *Accept (M3):* booking appears in admin; conflicting booking rejected; cancel frees interval.

---

## M4 — Admin operations (FR-07 – FR-11)

- [x] **T4.1 Demo login `/admin/login`** — demo-only flag, clearly labeled; route guard for `/admin/*` noted as non-security.
- [x] **T4.2 Dashboard `/admin`** — KPI cards derived from data, booking activity, upcoming bookings, station availability summary, quick actions.
- [x] **T4.3 Bookings `/admin/bookings`** — search (reference/customer), filters: date, source, booking status, payment status; table; details drawer/page; payment-status control (mock; separate from booking status); cancel with confirm.
- [x] **T4.4 Walk-in booking** — choose/quick-create customer, resource, start/duration, price calc, availability check, record payment status (mock), confirm; source = `ADMIN`; appears in customer availability.
- [x] **T4.5 Stations `/admin/stations`** — grid with derived status + legend; filters by type/status; detail panel; Mark maintenance / offline / restore with confirmation; warn about (or block per documented rule) overlapping future confirmed bookings; maintenance removes station from availability.
- [x] **T4.6 Sessions `/admin/sessions`** — tabs Active / Upcoming / Completed; elapsed/remaining timer; Start (from confirmed booking), Extend (with conflict validation result shown), Complete (confirm); near-end reminder state.
- [x] **T4.7 Customers `/admin/customers`** — searchable fictional list; booking history summary.
  *Accept (M4):* admin booking shares state with customer bookings; maintenance blocks availability; extension checks conflicts; payment/booking status distinct.

---

## M5 — Configuration & polish (FR-12 – FR-14)

- [ ] **T5.1 Resources `/admin/resources`** — create/edit/deactivate; validate name, type, branch, rate; reflected in booking flow.
- [ ] **T5.2 Pricing `/admin/pricing`** — hourly rates and simple discounts only (no peak/packages); reflected in price calc.
- [ ] **T5.3 Settings `/admin/settings`** — hub profile, opening hours, branch settings, **reset demo data** (with confirm).
- [ ] **T5.4 Revenue `/admin/revenue`** — cards + chart (add chart lib only if justified), clearly labeled demo; note definitions pending operator validation.
- [ ] **T5.5 State coverage pass** — loading, empty, validation, failure, success, disabled-with-explanation on every page; confirm dialogs for cancel, session complete, maintenance.
- [ ] **T5.6 Responsive & accessibility QA** — customer mobile-first; admin desktop + tablet; tables→cards or scroll; keyboard focus; labels; alt text; reduced motion.
  *Accept (M5):* edits propagate; no inert prominent buttons (else disabled with reason); reset works reliably.

---

## M6 — Operator feedback

- [ ] **T6.1 Demo script** covering: customer booking → admin sees it → walk-in → conflict rejection → maintenance → session start/extend/complete.
- [ ] **T6.2 Feedback log** kept separate from assumptions.
- [ ] **T6.3 Update docs** — PRD, domain model, and OPEN-QUESTIONS statuses (`OPEN/VALIDATED/REJECTED/DEFERRED`).
- [ ] **T6.4 Backend-requirements gate** — freeze only after high-impact questions are answered.

---

## Cross-cutting verification (from TEST-PLAN)

- [ ] Customer journey tests: discovery renders cards; filters update; valid slug opens hub; form validation; availability changes after booking; confirmation correct; my-bookings shows booking; cancellation updates status + availability; empty/error states visible.
- [ ] Admin journey tests: dashboard metrics derive from data; table search/filter; walk-in shared; maintenance removes from bookable results; restore re-enables subject to reservations; session start/extend/complete consistent; payment changes don’t alter booking status; resource/pricing edits reflected.
- [ ] Demo-safety: fictional data only; payment UI says mock; QR illustrative; admin login demo-only; nothing claims WhatsApp, geolocation, hardware monitoring, or real payments are connected.

## Success criteria (PRD §12)

Customer completes a mock booking → admin sees it → walk-in affects availability → conflicts rejected → maintenance blocks booking → session start/extend/complete works → payment state visually separate → works at mobile/tablet/desktop → nothing is a static decoration presented as working.

## Open decisions to settle during build (defaults suggested)

| Decision | Suggested default | Doc ref |
|---|---|---|
| Slot increment | 30 min | OPEN-QUESTIONS (Booking rules) |
| Min / max duration | 30 min / 4 h | OPEN-QUESTIONS |
| Cancellation cutoff | Future bookings only; configurable constant (e.g. ≥ 2 h before start) | PRD rule 8 |
| Maintenance vs. future confirmed bookings | Block with message listing conflicts (simplest) | UX-FLOWS §3 |
| Past/immediate start | Future slots only; walk-ins may start “now” | OPEN-QUESTIONS |
| `resourceService` | Add `services/resourceService.js` (referenced in contract, missing from structure list) | Contract vs. Architecture |
| Error code naming | Use `RESOURCE_UNAVAILABLE` (contract) | Architecture vs. Contract |
| Session `EXTENDED` status | Keep `ACTIVE` + `extensionCount`; treat `EXTENDED` as display only | PRD §10 vs. Domain Model |

## Out of scope (do not build)

Real auth/tenant isolation, payments/refunds, WhatsApp integration, geolocation search, QR security, cross-device sync, server locking, hardware status, tax invoices, platform-admin console.
