# ADR 0007: Attendant-Operated and Self-Service Modes

- Status: Accepted
- Date: 2026-10-02

## Decision

WanderBooth will provide two staff-selected operation modes:

1. **Attendant-Operated:** the operator controls the session from the Host laptop. The customer-facing screen is read-only.
2. **Self-Service:** the customer controls owner-approved session choices from the touchscreen. Staff retain payment, camera, recovery, and administrative controls.

The owner or attendant selects the mode while the booth is idle. The mode is fixed and recorded for the entire session. Because version 1 accepts cash, an attendant confirms payment in both modes.

## Control ownership

In Attendant-Operated mode, only staff can choose or change the product, layout, design/style, captured-photo replacement, retake, and final approval. Captured photos are shown on the customer display so the customer can verbally request a replacement, which the operator performs.

In Self-Service mode, the customer can perform those actions only within owner-configured product compatibility and retake rules. The selected product/layout supplies the required photo count automatically; it is not a separate operator or customer choice. Camera-source selection, cash confirmation, refunds, reprints, recovery, mode switching, and configuration remain staff-only.

The iPad is the first interactive touchscreen. Attendant-Operated mode can use either the iPad or a normal second monitor as its read-only customer display. A future dedicated touchscreen will run the same responsive customer client and may replace the iPad in either role.

## Why

- Some events need a staffed workflow where the operator directs the customer and controls every creative decision.
- Other events benefit from a familiar interactive photo-booth experience.
- Both workflows should share capture, rendering, printing, storage, QR delivery, and recovery behavior.
- Explicit server-side permissions prevent the attended customer display from becoming an accidental control surface.

## Trade-offs

- The product needs an operator console plus display-only and interactive customer presentations.
- Every feature must define its behavior and actor permissions in both modes.
- More mode combinations increase testing, reconnection, and state-synchronization requirements.
- Self-Service is not fully unattended while cash remains the only payment method.
