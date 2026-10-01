# WanderBooth Operation Modes

**Status:** Confirmed product behavior

**Version:** 0.6.0

**Updated:** 2026-10-02

WanderBooth supports two staff-selected workflows. The difference is who controls the session—not whether the booth has staff nearby. In this document, **operator** and **attendant** refer to the same staff role. Because the first release accepts cash, an attendant still confirms payment in both modes.

## At a glance

| Area | Attendant-Operated | Self-Service |
|---|---|---|
| Primary controller | Operator console on the Host laptop | Customer touchscreen |
| Customer screen | Display-only | Interactive kiosk |
| Product, layout, and design | Chosen by operator | Chosen by customer from owner-approved options |
| Required photo count | Automatically defined by selected product/layout | Automatically defined by selected product/layout |
| Capture start | Operator | Customer after cash approval |
| Photo review | Shown on customer display; changes are submitted by operator | Interactive on customer touchscreen |
| Replace photo / retake | Operator only | Customer within configured limits |
| Change design/style before approval | Operator only | Customer from compatible allowed choices |
| Align imported frame, photo holder, or image crop | Operator only | Attendant on operator console |
| Final approval | Operator | Customer |
| Cash confirmation | Attendant | Attendant |
| Camera-source selection | Owner or attendant | Owner or attendant |
| Recovery, refund, reprint | Owner or attendant | Owner or attendant |
| QR scanning and downloads | Customer | Customer |

## Mode selection

- The owner or attendant selects a mode from the PIN-protected operator console.
- A booth/event profile can define the default mode.
- The active mode is always visible on the operator console.
- The mode is copied onto every new session record.
- The mode cannot change while a session is active.
- Switching modes requires the booth to be idle or the current session to be explicitly cancelled or recovered with an audit entry.
- Customers never receive a mode-selection control.

## Attendant-Operated workflow

### Physical setup

- The operator uses the Host laptop and its operator console.
- The customer sees a separate read-only screen. The first pilot supports either a second monitor attached to the Host or the iPad/browser in display-only mode.
- On the iPad, Sidecar is suitable for this display-only presentation. The Safari customer URL also works and does not require Sidecar.
- A future dedicated touchscreen can run the same responsive customer client in display-only or Self-Service mode.
- The customer display can show the live preview, countdown, captured images, waiting states, processing, print status, QR code, and completion message.
- The customer display does not provide session-choice buttons.

### Control flow

1. The operator chooses the product.
2. The operator chooses a compatible layout and either a fixed colored frame with an optional built-in decoration or one imported custom frame.
3. WanderBooth loads and shows the photo count required by that product/layout.
4. The operator explains the privacy notice and records the customer's consent.
5. The operator confirms cash received.
6. The operator starts one automatic three-photo sequence. The customer display shows the mirrored preview and the Host-controlled three-second countdown before every photo.
7. WanderBooth shows the finished composed layout plus each full, uncropped source capture to the customer and operator.
8. The customer may verbally request a replacement; the operator alone selects the photo slot and starts the replacement/retake.
9. The operator may change to a compatible frame, then use the direct composition canvas to select, drag, and corner-resize the imported artwork or a photo frame. Crop image mode moves and zooms the capture inside that frame before approval.
10. WanderBooth renders, prints, uploads, and shows the QR code.

Even when the customer display shows captured images, only the operator can submit replacement, retake, design, or approval actions.

## Self-Service workflow

### Physical setup

- The customer uses the iPad first and may later use a dedicated touchscreen running the same responsive interactive kiosk.
- The iPad opens the local customer URL in Safari for normal finger touch. Sidecar is not the Self-Service input path.
- The operator console remains available for cash confirmation, status, overrides, and recovery.
- If the iPad camera is the active camera source, the same client supplies the preview and captures before sending them to the Host.

### Control flow

1. The customer chooses an enabled product.
2. WanderBooth offers compatible layouts and an exclusive choice between owner-approved fixed-color and imported custom frames.
3. The selected product/layout automatically supplies and displays the required photo count.
4. The customer accepts the privacy notice.
5. The interface waits while the attendant confirms cash.
6. The customer taps once to start all three photos. The Host shows the synchronized three-second countdown before every photo.
7. The customer reviews the final composed layout and the full uncropped source captures.
8. Within the configured limit, the customer may replace a selected photo or retake.
9. Before final approval, the customer may change to another compatible enabled frame. Detailed imported-frame and photo alignment remains an attendant control on the operator console.
10. The customer approves the result.
11. WanderBooth renders, prints, uploads, and shows the QR code.

Self-Service does not grant access to camera selection, payment confirmation, refunds, reprints, diagnostics, mode changes, or owner settings.

See [iPad setup](IPAD_SETUP.md) for the exact Safari and Sidecar steps.

## Photo replacement and style rules

- Photo count is not an independent session choice. Each enabled product/layout combination defines the exact number of unique captures, currently three or four.
- A layout may intentionally repeat one capture in several visible slots, such as the left and right copies on a double-strip sheet.
- WanderBooth shows that required number before cash confirmation and capture.
- A replacement chooses one existing slot, captures a new photo, and replaces only that slot after confirmation.
- Every initial photo and replacement uses the same Host-controlled three-second countdown on all connected screens.
- The live posing preview is mirrored; saved, printed, and downloadable photos are not mirrored.
- The initial rule remains up to two retake/replacement actions per session; whether that limit is shared across all slots remains configurable until finalized.
- Choosing a custom frame clears the fixed color and built-in decoration; choosing a fixed color clears the custom frame. The two frame sources cannot be combined accidentally.
- Changing a compatible frame or built-in decoration re-renders existing accepted captures and does not consume a retake.
- Source-photo cards use the capture's full aspect ratio rather than cropping it into a decorative review card. Cropping happens only inside the visible final-layout slots, where the operator can inspect it directly.
- Custom alignment stores one transform for the imported artwork, one photo-frame transform per unique capture, and one image-crop transform per unique capture. Repeated slots reuse both transforms so matching double-strip copies remain synchronized. The operator manipulates these objects directly on the preview; editor guides never appear in the output.
- Before capture, changing the product/layout recalculates the required count automatically.
- After capture, changing to a layout with the same count may reuse the accepted captures. A layout requiring a different count needs an explicit staff/customer confirmation and controlled recapture/restart flow; it can never discard paid-session work silently.
- Once the result is finally approved, further changes require staff recovery.
- Once printed, a changed result is a staff-authorized reprint and must be audited to prevent accidental duplicates.
- Staff can cancel an active session from the operator console. Cancellation clears any countdown or pending capture and returns the booth to idle without changing the configured mode or camera source.

## Permission enforcement

The Host enforces these rules even if a hidden URL or malformed command is used:

- customer connections receive only the permissions allowed by the session's fixed mode;
- display-only connections cannot submit choices or mutations;
- staff actions require an authenticated staff session;
- commands include the session identifier, expected state, actor, and an idempotency key;
- invalid actor/action/state combinations are rejected and logged; and
- reconnecting screens reload the current persisted session rather than assuming local state is current.

## Acceptance checks

- Both modes can complete the same product from selection through QR delivery.
- Attendant-Operated mode can run without any touch input on the customer display.
- Customer-side selection, retake, replacement, style, approval, and mode-change commands are rejected during an Attendant-Operated session.
- Self-Service never displays products or combinations disabled by the owner.
- Both modes derive the capture count from the selected product/layout and provide no independent photo-count control.
- Cash confirmation remains staff-only in both modes.
- A mode cannot change during an active session.
- Operator and customer screens recover to the same state after a connection or application restart.
- The session history shows its mode and the actor for every important decision.
