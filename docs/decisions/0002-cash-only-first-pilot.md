# ADR 0002: Cash-Only First Pilot

- Status: Accepted
- Date: 2026-10-02

## Decision

The first WanderBooth pilot will accept cash only. A booth attendant confirms the payment before the customer begins the photo session. QR Ph, GCash, Maya, and card payments are deferred until the photo, print, recovery, and QR-delivery workflows are reliable.

## Why

- It removes payment-provider onboarding and network dependency from the first technical milestone.
- It keeps the pilot focused on the core booth experience.
- An attendant will be available to accept cash. In Attendant-Operated mode, the attendant also controls all session choices; in Self-Service mode, the customer chooses from owner-approved options.

## Trade-offs

- The booth cannot be fully unattended during the first pilot.
- Self-Service describes who controls the creative session flow; it does not remove the cash-confirmation requirement.
- Cash reconciliation and change handling must be documented.
- The future electronic-payment flow will add new session states and failure cases.
