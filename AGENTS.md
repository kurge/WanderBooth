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
| `pnpm cloud:dev` | Run the Cloudflare QR service locally with D1 and R2 emulation |
| `pnpm cloud:migrate:local` | Apply the QR delivery schema to the local D1 database |
| `pnpm cloud:migrate:remote` | Apply the QR delivery schema to the configured Cloudflare D1 database |
| `pnpm cloud:deploy` | Deploy the configured QR delivery Worker |
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
                                      ├── event/session media folders
                                      ├── camera sources (simulator + Mac media device)
                                      ├── Sharp filters + layout/frame/composition renderer
                                      ├── 4×6 print sheet + native print dialog bridge
                                      └── persistent QR upload queue ── HTTPS ── Cloudflare Worker
                                                                                       ├── D1 delivery state
                                                                                       └── private R2 media
```

- `src/app/` — responsive React operator and customer interfaces.
- `src/host/` — local HTTP/WebSocket service, persistence, and deliverable processing.
- `src/camera/` — Host-side replaceable camera adapters; currently contains the simulator.
- `src/app/useMacBookCamera.ts` — standard media-device preview and JPEG capture for the Mac operator renderer.
- `src/shared/` — event records, template collections, product catalog, permissions, session state machine, and wire messages.
- `src/cloud/` — authenticated Cloudflare upload API, private mobile guest gallery, and scheduled expiry cleanup.
- `cloud/` — Wrangler configuration and D1 migrations. Local secrets belong only in ignored `cloud/.dev.vars`.
- `electron/` — desktop window wrapper for the operator surface.
- `assets/brand/` — owner-supplied Wander Press source artwork and documented color tokens.
- `docs/` — product, hardware, operating-mode, and architecture decisions.
- `data/` — private runtime database and generated media; ignored by Git.

The Host is authoritative. Every screen sends a command, the Host applies role and phase rules, persists the result, and broadcasts one shared state back to all displays. Do not recreate session rules independently in UI components.

## Current Phase 0 boundaries

- Products/templates: two normal product families expose five built-in layouts, five frame palettes, four built-in overlays, locally imported event frames, and a persistent staff-managed Template Library. Staff can also build portrait or landscape custom 4×6 templates with one to eight holders. Each holder maps to Capture 1–8, repeated capture labels are allowed, and the normalized labels determine the unique capture count.
- Events: the operator starts in a local event library. Each event owns isolated template copies and completed session records. Captures and deliverables are written below `data/events/<event-id>/sessions/<session-id>/`; archiving hides an event without deleting it, while confirmed event deletion removes both its state record and local event directory.
- Template collections: reusable library templates may belong to multiple folders. New events copy one selected folder. Event edits never mutate the master; an explicit promote action creates a new library master in selected folders.
- Payments: staff-confirmed cash only; price is intentionally absent from the UI.
- Camera: simulator and experimental MacBook camera work; Fujifilm X-M5 follows. Camera selection remains staff-only and idle-only.
- Capture: one command starts the product-defined sequence. Countdown ticks and capture triggers are Host-owned and broadcast to every screen.
- Preview: the Mac renderer sends reduced mirrored JPEG frames to an in-memory Host relay; full-resolution unmirrored captures use a separate persisted route.
- Delivery: schema version 14 gives each completed session a stable random QR token, exact 30-day expiry, persistent retry metadata, and one of `not_configured`, `queued`, `uploading`, `ready`, `failed`, or `expired`. The Host uploads only branded individual photos, the final layout, and slideshow. It never uploads raw captures or the print-only sheet. The Cloudflare Worker stores media in private R2, state in D1, serves the tokenized mobile gallery, and cleans expired media hourly. The operator can configure, retry, and re-display delivery; internet failure never blocks local capture, processing, or printing.
- Cloud production: `wanderbooth-delivery.wanderpressph.workers.dev` uses D1 database and private R2 bucket `wanderbooth-delivery`, hourly cleanup at minute 17, a 31-day R2 lifecycle backstop, and disabled preview URLs. Never place the `DEVICE_TOKEN` value in code, docs, shell output, screenshots, or Git.
- Rendering: layout slots can repeat capture indices and use rectangle, rounded, or heart masks. Repeated custom holders keep independent holder/crop transforms through stable holder IDs even when they show the same capture. A session uses either a generated fixed-color frame (with an optional built-in treatment) or one imported custom frame. New imports use transparent PNG artwork with pre-cut openings; legacy flat-template records remain renderable. The staff-only Template Library and isolated event copies store approved product/layout/artwork combinations plus all placeholder, holder, crop, rotation, and lock transforms. Selecting a saved template fills those numbered positions with real captures. The Host applies the same persisted transforms in preview and export.
- Review: the final composed layout is the primary preview. Captured and waiting source cards share a 16:9 footprint and use `contain` for uncropped review. The staff-only direct canvas uses click/tap selection, drag movement, proportional corner resizing, independent middle-edge crop-frame reshaping, direct rotation, object locking, and Crop image mode. Holder bounds may change aspect ratio, but the photo content always keeps its natural proportions. Frame artwork, each photo frame, and the image inside each frame have separate normalized transforms in authoritative Host state. Imported templates can be deleted with confirmation from the operator UI.
- Filters: review supports Original, B&W, Warm, Cool, Vintage, and High Contrast per capture. Selection is non-destructive in Host state; Sharp applies it to final individuals, composites, slideshow inputs, and prints.
- Printing: every completed session has an explicit 300-DPI 4×6 print deliverable. A single 2×6 design is duplicated across both halves. Operator completion and event history open a dedicated preview, Electron invokes the native print dialog, and session history stores print outcomes. Automatic queue control, printer telemetry, and verified Epson settings are not implemented yet.
- Authentication: local prototype roles are screen-based, not authenticated accounts.
- Distribution: the current Mac build is unsigned and intended only for this development machine. Public downloads will require Apple Developer signing and notarization.

## Safety rules

This is a public repository. Never commit real customer photos, runtime databases, session exports, Cloudflare device tokens, `.dev.vars`, API keys, private business records, machine serial numbers, hardware UUIDs, or personal device identifiers. Use synthetic media in tests and screenshots. Keep all runtime output inside ignored directories.

When a material technical or product decision changes, update the relevant document and `WanderBooth - Changelog.md` in the same commit. Prefer small, understandable commits and explain user-visible behavior in plain language.
