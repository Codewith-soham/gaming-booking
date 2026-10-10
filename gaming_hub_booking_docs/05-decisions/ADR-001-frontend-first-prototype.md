# ADR-001: Frontend-First Prototype with Shared Mock Services

- **Status:** Accepted for initial prototype
- **Date:** 2026-10-10

## Context

The team wants a polished customer website and gaming-hub admin panel to demonstrate the concept to operators before committing to the complete backend. The product includes online and offline booking, station status, sessions, payments, and a planned WhatsApp channel.

## Decision

Build a React + Vite + Tailwind frontend with React Router. Use a shared mock domain and service layer for hubs, resources, availability, bookings, pricing, and sessions. Both customer and admin interfaces must use the same services and state.

## Reasons

- Enables early demonstrations and workflow validation.
- Avoids implementing the same business rules separately in each interface.
- Creates a seam for replacing mock repositories with API clients later.
- Exposes missing business decisions before backend schema is frozen.

## Consequences

Positive:
- Faster iteration on UX.
- Customer and admin flows can be demonstrated together.
- Shared state makes basic conflict scenarios testable in one browser session.

Trade-offs:
- No authoritative persistence or multi-user synchronization.
- Browser-only validation is not production booking protection.
- Mock revenue and station state do not represent real operations.
- Some decisions will change after operator research.

## Follow-up

Before production:
- Define tenant isolation and authorization.
- Implement server-side availability revalidation and conflict protection.
- Define payment and cancellation policies.
- Define session/extension rules.
- Define WhatsApp provider/webhook architecture.
