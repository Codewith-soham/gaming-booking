# Open Questions and Assumptions

Keep these questions visible and update each with a status: `OPEN`, `VALIDATED`, `REJECTED`, or `DEFERRED`.

## Booking rules
- Can customers select a specific PC, or only a category?
- Is a booking per station, per person, or per group?
- What are the minimum and maximum session durations?
- Are slots fixed increments or arbitrary start/end times?
- Can bookings start immediately, or only in future slots?
- What is the cancellation cutoff and refund policy?
- How are no-shows handled?
- Can staff override conflicts? If yes, how is the override audited?

## Walk-ins and operations
- How are walk-ins recorded today?
- Does staff assign the exact PC before the customer starts?
- Is a station's occupied state manually updated, inferred from a session, or monitored by software?
- What happens if a PC fails while booked?
- Can maintenance be scheduled for a future interval?
- Who can start, extend, and complete sessions?

## Sessions
- Is the session start time the reservation start or actual check-in?
- Are late arrivals given the full duration?
- Can a session end early?
- How is extension priced and approved?
- Must extensions be blocked when a future reservation exists?
- Is there a grace period after the booking end?

## Pricing and payments
- Is pricing hourly, per fixed block, per resource, or per person?
- Are peak/off-peak prices needed?
- Are discounts, packages, memberships, or prepaid wallets needed for V1?
- Is payment made online, at the hub, or either?
- Which payment provider is preferred?
- What do the owner and staff mean by “revenue” (booked value, collected payments, net after refunds, etc.)?
- Are tax invoices required?

## Hub model
- Can one owner operate multiple branches?
- Can branches have different resource types, rates, and opening hours?
- Can a resource move between categories or branches?
- Are non-PC resources (PS5, Xbox, VR, racing simulator) required at launch?

## WhatsApp
- Is the hub's existing WhatsApp Business number used?
- Should users discover hubs through a central number or message an individual hub?
- Does a booking require a deposit?
- Which notifications are required and at what time?
- What fallback is offered if a requested slot becomes unavailable during the conversation?

## Commercial validation
- Who is the buyer: owner, manager, or chain operator?
- What tools do they use today?
- What is the most expensive operational problem?
- Would they pay for online booking, WhatsApp automation, operational dashboard, or the combination?
- What is the acceptable onboarding effort?
- What data must be imported during setup?

## Initial assumptions for the prototype
- Each booking reserves one specific resource.
- One hub may have multiple branches.
- The initial UI shows mock payment state only.
- Admin station status is simulated, not hardware-derived.
- WhatsApp is planned but not integrated in prototype.
- The customer can book from the website without a real account in demo mode.
- Admin login is simulated only.
