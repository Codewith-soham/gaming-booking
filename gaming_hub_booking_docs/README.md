# Gaming Hub Booking System — Documentation Pack

**Purpose:** Define the frontend-first prototype and the engineering contracts needed to begin implementation.

## Read in this order

1. `01-product/PRD.md` — product scope, users, goals, requirements, acceptance criteria.
2. `01-product/UX-FLOWS.md` — customer and admin journeys.
3. `02-architecture/FRONTEND-ARCHITECTURE.md` — React/Vite/Tailwind structure and routing.
4. `02-architecture/DOMAIN-MODEL.md` — core entities and lifecycle concepts.
5. `03-contracts/MOCK-SERVICES-CONTRACT.md` — frontend service boundaries and mock behavior.
6. `03-contracts/ROUTES-AND-PAGE-SPEC.md` — route/page inventory.
7. `03-contracts/UI-DESIGN-SYSTEM.md` — visual direction and component conventions.
8. `04-delivery/IMPLEMENTATION-PLAN.md` — milestones and coding order.
9. `04-delivery/TEST-PLAN.md` — verification checklist.
10. `05-decisions/ADR-001-frontend-first-prototype.md` — key initial decisions and trade-offs.
11. `05-decisions/OPEN-QUESTIONS.md` — assumptions to validate with gaming-hub operators.

## Current project status

This pack is a starting baseline for a **frontend-first prototype**. It is not a final production specification. The UI uses mock data and simulated operations; real authentication, payments, WhatsApp, geolocation, server-side persistence, and concurrency guarantees are out of scope for the first milestone.

## Baseline decisions

- Frontend: React + Vite + Tailwind CSS.
- Routing: React Router.
- Two interfaces: customer website and hub admin panel.
- One shared booking/resource domain model and shared mock services.
- Booking source is recorded as `WEBSITE`, `WHATSAPP`, or `ADMIN`.
- Booking status, payment status, session status, and station operational status are separate concepts.
- All times are stored/handled as ISO timestamps in the prototype; production API should standardize on UTC and display in the hub's local timezone.
- Do not claim a station is truly “live” until a real source of operational state is integrated.
