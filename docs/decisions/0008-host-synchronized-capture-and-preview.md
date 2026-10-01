# ADR 0008: Host-Synchronized Capture and In-Memory Preview Relay

- Status: Accepted
- Date: 2026-10-02

## Decision

The WanderBooth Host owns the countdown and capture sequence. One operator or customer action starts the complete product-defined sequence: three, four, or six photos with a three-second countdown before each photo. Every connected screen observes the same persisted session state instead of running its own independent timer.

For the MacBook camera, the operator renderer publishes a reduced 960×540 mirrored JPEG preview to the Host at approximately five frames per second. The Host keeps those frames only in memory and relays them to the iPad/customer client as a multipart image stream. The full saved capture follows a separate path at the camera's available resolution and is not mirrored.

```text
Mac camera ── 960×540 mirrored JPEG preview ──> Host memory relay ──> iPad
     │
     └──── full-resolution unmirrored capture ─> Host session storage

Host countdown/state ── WebSocket ──> operator and customer screens
```

The operator receives a visible **Cancel session** control throughout an active session. Resetting cancels the current countdown and returns the booth to idle while preserving the staff-selected mode and camera source.

## Why

- A single authoritative timer prevents the laptop and iPad from showing different countdown numbers.
- One tap is safer and easier for customers than manually starting every photo.
- A familiar mirrored preview helps people pose, while unmirrored saved photos preserve normal output.
- Keeping preview frames out of the database and filesystem avoids unnecessary customer-image retention and disk traffic.
- Separating preview quality from capture quality prevents a network-friendly iPad feed from lowering the delivered image resolution.

## Contracts and failure behavior

- `START_CAPTURE_SEQUENCE` begins the selected layout's complete sequence only when the session is ready.
- `RETAKE` begins the same three-second countdown for one selected existing slot.
- Only the Host can advance `COUNTDOWN_TICK`, trigger a capture, or accept a completed capture.
- Each uploaded capture must match the pending session, slot, kind, and revision.
- A preview interruption does not fail or duplicate the saved capture workflow.
- A camera-capture failure clears the pending sequence and moves the session to an operator-visible error state.
- A reset clears the pending countdown/capture before another guest can begin.

## Trade-offs and limits

- Repeated JPEG preview frames are simpler than WebRTC for the first local iPad client, but they use more bandwidth and are intended for one customer display during Phase 0.
- The local preview endpoint does not yet authenticate clients. It must remain on a trusted booth network until local screen pairing/authentication is implemented.
- The preview starts only while the operator renderer has enabled the MacBook camera.
- If field testing requires multiple displays, lower latency, audio, or operation across an untrusted network, revisit WebRTC or a paired authenticated stream.
