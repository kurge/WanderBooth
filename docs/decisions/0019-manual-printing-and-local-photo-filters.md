# ADR 0019: Manual Native Printing and Local Per-Photo Filters

- Status: Accepted
- Date: 2026-10-06

## Context

The first pilot needs physical output before WanderBooth needs automatic printer-queue management. Guests also expect simple post-capture looks, while AR masks remain useful but too dependent on an effect engine, licensing, and live-camera performance to make them part of this milestone.

The Epson L8050 supports 4×6 media. The single-strip WanderBooth product produces one 2×6 design, while other products already fill an entire portrait or landscape 4×6 canvas.

## Decision

- Add six static per-photo filters: Original, B&W, Warm, Cool, Vintage, and High Contrast.
- Store the selected filter as metadata on each capture. Never modify the original capture.
- Use CSS only for the fast review approximation and Sharp as the authoritative final renderer.
- Generate one explicit 300-DPI 4×6 print deliverable for every completed session.
- Duplicate a single 2×6 design on the left and right halves of the 4×6 print sheet.
- Show an in-app print preview, then open the native operating-system printer dialog.
- Keep printing staff-only. Self-Service completion notifies the operator visually and with a short ding.
- Store each print-dialog attempt in the completed event session. Electron can update an attempt to sent, cancelled, or failed; browser-only fallback remains dialog-opened.
- Keep AR behind a future provider boundary. Evaluate MediaPipe first for local control, with Snap Camera Kit and DeepAR as managed alternatives.
- Advance persisted state to schema version 13.

## Consequences

- The pilot can use any printer visible to macOS or Windows without building a printer-settings interface first.
- Operators must choose printer, 4×6 paper, orientation, scale, quality, and borderless settings for each native dialog until presets/queue automation are added.
- Print history is useful but does not know which native printer/settings/copy count were selected.
- Static filters remain available offline and render consistently into every deliverable.
- AR is not blocked, but choosing an AR SDK does not contaminate the capture or template model prematurely.

## Rejected alternatives

- **Automatic print immediately after guest approval:** too risky before the Epson settings and physical output are certified.
- **Native 2×6 paper as the first workflow:** not an established L8050 media path; standard 4×6 sheets are simpler and support two cut strips.
- **Cloud filter API:** unnecessary latency, cost, privacy exposure, and internet dependency for six static looks.
- **Choose an AR vendor now:** no live effect catalog, license, performance, or offline comparison has been completed.

