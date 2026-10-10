# UI Design System

## Visual direction

Premium dark gaming aesthetic: modern, controlled, high contrast, operationally clear. Avoid making every element neon or animated.

## Initial tokens

- Background: `#0B0D12`
- Surface: `#171A23`
- Elevated surface: `#1E2230`
- Border: `#2B3040`
- Primary text: `#F3F4F6`
- Secondary text: `#9CA3AF`
- Accent violet: `#A78BFA`
- Accent hover: `#8B5CF6`

Semantic status colors must be distinguishable without relying only on color; include text labels/icons:
- Available: green
- Reserved: amber
- Occupied: red
- Maintenance/offline: neutral/red-orange as appropriate
- Payment paid: green
- Payment pending/unpaid: amber/neutral
- Payment failed: red

## Typography and spacing

- Use a clear display heading on customer landing pages.
- Admin headings should be compact and task-oriented.
- Use a consistent spacing scale and radius scale through Tailwind tokens/utilities.
- Use tabular numerals for times, prices, and metrics when practical.
- Avoid tiny secondary text for operationally important information.

## Component conventions

- Buttons: primary, secondary, ghost, destructive, disabled.
- Inputs: label, helper text, validation message.
- Badges: status label and optional icon; never color alone.
- Cards: consistent padding, border, hover state only if clickable.
- Tables: sticky/clear header where useful, responsive overflow, empty state.
- Dialogs: keyboard accessible, explicit cancel/confirm labels.
- Toasts: concise success/failure feedback.
- Forms: preserve values after validation errors.

## Motion

Use subtle hover transitions and short entrance transitions only where they improve hierarchy. Respect reduced-motion preferences. Avoid animations that delay repeated admin actions.

## Accessibility

- Semantic headings and buttons.
- Visible keyboard focus.
- Labels for every form control.
- Sufficient contrast.
- Do not convey status only through color.
- Modals/dialogs must be keyboard accessible.
- Images need meaningful alt text or empty alt for decorative images.

## Responsive expectations

- Customer discovery and booking: mobile-first.
- Admin dashboard: desktop-first, tablet-usable.
- On narrow screens, convert wide tables to cards or provide intentional horizontal scrolling.
