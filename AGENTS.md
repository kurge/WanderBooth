# WanderBooth Development Guide

This repository contains WanderBooth, an offline-first photo booth application for Wander Press PH. The operator experience runs on a Mac or Windows laptop. A responsive browser view is used by the iPad or a second customer-facing screen.

## Development commands

Run these commands from this repository with Node.js 22.5 or later and pnpm 10.14 or later.

| Command | Purpose |
|---|---|
| `pnpm install` | Install exact dependencies from `pnpm-lock.yaml` |
| `pnpm dev` | Run the local Host and browser app |
| `pnpm dev:desktop` | Run the Host, browser app, and Electron operator window |
| `pnpm test` | Run unit tests once |
| `pnpm build` | Type-check and build Host and browser bundles |
| `pnpm package:mac` | Build a local Apple-silicon `.app` under `release/mac-arm64/` |
| `pnpm package:mac:dmg` | Build an Apple-silicon installation disk image under `release/` |
| `pnpm check` | Run formatting/lint checks, tests, and production builds |
| `pnpm format` | Format supported project files |

Open `http://localhost:5173/?surface=operator` for the operator surface. Open `http://<mac-lan-address>:5173/?surface=customer` on the iPad for the customer surface while both devices are on the same local network.

## Architecture overview

```text
Operator window ─┐
                 ├── WebSocket ── Local Host ── SQLite event/state store
iPad display ────┘                     │
                                      ├── Host-owned countdown/capture sequence
                                      ├── in-memory local preview relay
                                      ├── camera sources (simulator + Mac media device)
                                      └── data-driven layout/frame/composition renderer
```

- `src/app/` — responsive React operator and customer interfaces.
- `src/host/` — local HTTP/WebSocket service, persistence, and deliverable processing.
- `src/camera/` — Host-side replaceable camera adapters; currently contains the simulator.
- `src/app/useMacBookCamera.ts` — standard media-device preview and JPEG capture for the Mac operator renderer.
- `src/shared/` — product catalog, reusable template records, permissions, session state machine, and wire messages.
- `electron/` — desktop window wrapper for the operator surface.
- `assets/brand/` — owner-supplied Wander Press source artwork and documented color tokens.
- `docs/` — product, hardware, operating-mode, and architecture decisions.
- `data/` — private runtime database and generated media; ignored by Git.

The Host is authoritative. Every screen sends a command, the Host applies role and phase rules, persists the result, and broadcasts one shared state back to all displays. Do not recreate session rules independently in UI components.

## Current Phase 0 boundaries

- Products/templates: two product families currently expose five layouts, five frame palettes, four built-in overlays, locally imported event frames, and a persistent staff-managed Template Gallery. Layout geometry fixes the unique capture count at three, four, or six; the double-strip 4×6 uses six different shots.
- Payments: staff-confirmed cash only; price is intentionally absent from the UI.
- Camera: simulator and experimental MacBook camera work; Fujifilm X-M5 follows. Camera selection remains staff-only and idle-only.
- Capture: one command starts the product-defined sequence. Countdown ticks and capture triggers are Host-owned and broadcast to every screen.
- Preview: the Mac renderer sends reduced mirrored JPEG frames to an in-memory Host relay; full-resolution unmirrored captures use a separate persisted route.
- Delivery: branded local files work; cloud upload, QR generation, and 30-day expiry are not implemented yet.
- Rendering: layout slots can repeat capture indices and use rectangle, rounded, or heart masks. A session uses either a generated fixed-color frame (with an optional built-in treatment) or one imported custom frame. New imports use transparent PNG artwork with pre-cut openings; legacy flat-template records remain renderable. The staff-only Template Gallery stores approved product/layout/artwork combinations plus all placeholder, holder, crop, rotation, and lock transforms. Selecting a saved template fills those numbered positions with real captures. The Host applies the same persisted transforms in preview and export.
- Review: the final composed layout is the primary preview. Captured and waiting source cards share a 16:9 footprint and use `contain` for uncropped review. The staff-only direct canvas uses click/tap selection, drag movement, proportional corner resizing, independent middle-edge crop-frame reshaping, direct rotation, object locking, and Crop image mode. Holder bounds may change aspect ratio, but the photo content always keeps its natural proportions. Frame artwork, each photo frame, and the image inside each frame have separate normalized transforms in authoritative Host state. Imported templates can be deleted with confirmation from the operator UI.
- Printing: the 2×6 and 4×6 composite files render at 300 DPI. The first double-strip file now exists, but Epson L8050 queue control is not implemented yet.
- Authentication: local prototype roles are screen-based, not authenticated accounts.
- Distribution: the current Mac build is unsigned and intended only for this development machine. Public downloads will require Apple Developer signing and notarization.

## Safety rules

This is a public repository. Never commit real customer photos, runtime databases, session exports, secrets, private business records, machine serial numbers, hardware UUIDs, or personal device identifiers. Use synthetic media in tests and screenshots. Keep all runtime output inside ignored directories.

When a material technical or product decision changes, update the relevant document and `WanderBooth - Changelog.md` in the same commit. Prefer small, understandable commits and explain user-visible behavior in plain language.
