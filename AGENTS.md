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
| `pnpm check` | Run formatting/lint checks, tests, and production builds |
| `pnpm format` | Format supported project files |

Open `http://localhost:5173/?surface=operator` for the operator surface. Open `http://<mac-lan-address>:5173/?surface=customer` on the iPad for the customer surface while both devices are on the same local network.

## Architecture overview

```text
Operator window ─┐
                 ├── WebSocket ── Local Host ── SQLite event/state store
iPad display ────┘                     │
                                      ├── camera adapter (simulator first)
                                      └── local deliverable renderer
```

- `src/app/` — responsive React operator and customer interfaces.
- `src/host/` — local HTTP/WebSocket service, persistence, and deliverable processing.
- `src/camera/` — replaceable camera adapters. Only the simulator exists in Phase 0.
- `src/shared/` — product catalog, permissions, session state machine, and wire messages.
- `electron/` — desktop window wrapper for the operator surface.
- `docs/` — product, hardware, operating-mode, and architecture decisions.
- `data/` — private runtime database and generated media; ignored by Git.

The Host is authoritative. Every screen sends a command, the Host applies role and phase rules, persists the result, and broadcasts one shared state back to all displays. Do not recreate session rules independently in UI components.

## Current Phase 0 boundaries

- Product: one three-photo vertical 2×6 strip; its layout fixes the capture count at three.
- Payments: staff-confirmed cash only; price is intentionally absent from the UI.
- Camera: simulator is active; MacBook camera is the next adapter; Fujifilm X-M5 follows.
- Delivery: branded local files work; cloud upload, QR generation, and 30-day expiry are not implemented yet.
- Printing: 2×6 artwork is rendered at 600×1800 pixels and 300 DPI, but Epson L8050 queue control is not implemented yet.
- Authentication: local prototype roles are screen-based, not authenticated accounts.

## Safety rules

This is a public repository. Never commit real customer photos, runtime databases, session exports, secrets, private business records, machine serial numbers, hardware UUIDs, or personal device identifiers. Use synthetic media in tests and screenshots. Keep all runtime output inside ignored directories.

When a material technical or product decision changes, update the relevant document and `WanderBooth - Changelog.md` in the same commit. Prefer small, understandable commits and explain user-visible behavior in plain language.
