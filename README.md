---
title: WanderBooth
aliases:
  - WanderBooth Project Home
tags:
  - wanderbooth
  - app
  - product-development
status: active
created: 2026-10-01
updated: 2026-10-02
---

# WanderBooth

WanderBooth is an offline-first photo booth application being developed for our own photo business. It supports two staff-selected workflows: **Attendant-Operated**, where staff control the session from the laptop and the customer display is read-only, and **Self-Service**, where the customer chooses from owner-approved products, layouts, and designs on the touchscreen. The selected product/layout automatically determines how many photos are required. The first touchscreen is an iPad; a future dedicated touchscreen can use the same interface. Attended sessions can use either the iPad or a normal second monitor as the customer display. The desktop Host will target Windows 11 and macOS Sequoia 15.7.5 or later. Operators can select among supported dedicated cameras, USB webcams, the computer's built-in camera, or the iPad camera. WanderBooth will sell both branded digital photos and physical prints, accept attendant-confirmed cash payments, and let customers retrieve their completed photos and looping slideshow from a private 30-day cloud link by scanning a QR code.

## Project documents

- [Product plan and feature specification](<WanderBooth - Product Plan and Feature Specification.md>) — product direction, customer flow, features, architecture, roadmap, risks, and open questions.
- [Changelog](<WanderBooth - Changelog.md>) — chronological record of material documentation and product-plan changes.
- [Hardware baseline](docs/HARDWARE.md) — owned devices, known compatibility, risks, and the Phase 0 hardware test plan.
- [Camera compatibility matrix](docs/CAMERA_COMPATIBILITY.md) — camera sources, adapter types, test status, and product-level approval.
- [Operation modes](docs/OPERATION_MODES.md) — control ownership, screen behavior, permissions, and workflows for Attendant-Operated and Self-Service use.
- [Architecture decision records](docs/decisions/) — short records explaining why major technical and product choices were made.

## Current project state

- Product name: **WanderBooth**
- Product-plan version: **0.6.1 — Packaged Mac Build and Supplied Branding**
- Development status: **Phase 0 working prototype**
- Starting Host: **MacBook Pro (Mac15,6), Apple M3 Pro, 18 GB memory, macOS 15.7.5**
- First prototype: **three-photo vertical 2×6 strip**, iPad customer screen, no on-screen price
- Current camera: **prototype simulator**; MacBook camera is the next adapter and Fujifilm X-M5 is the first dedicated-camera target
- Immediate next step: connect the MacBook camera through the standard browser camera adapter, then test the operator and iPad surfaces together.
- Source-code repository: **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**
- Repository visibility: **Public**

> [!warning] Public-repository safety
> The WanderBooth repository is public. Never commit customer photos, session databases, payment data, passwords, API keys, local backups, diagnostic exports, or private business records. The project folder is a separate nested Git repository so it does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.

## What works in the Phase 0 prototype

- One synchronized session shared by the laptop operator view and iPad/customer view.
- Staff-selected Attendant-Operated or Self-Service control.
- Fixed three-photo vertical 2×6 product with the photo count derived from the layout.
- Cash confirmation before capture, with no price shown in the application.
- Two retakes, design selection, customer preview, and final approval.
- Local SQLite state and event history so the Host remains authoritative.
- Three branded individual PNGs, a 600×1800-pixel 2×6 strip at 300 DPI, and an MP4 slideshow.
- Synthetic camera output for safe development without customer images.
- A double-clickable Apple-silicon Mac application and local DMG build.
- Supplied Wander Press PH artwork and exact blue, lime, yellow, cream, orange, and purple brand tokens.

The prototype does **not** yet control the MacBook camera or X-M5, print to the Epson L8050, upload to cloud storage, or generate the private 30-day QR page. These are explicit upcoming milestones rather than hidden assumptions.

## Open the app on this Mac

The current local installation image is generated at `release/WanderBooth-0.1.0-arm64.dmg`. Double-click it in Finder, then drag **WanderBooth** into **Applications**. This build is for the current Apple-silicon Mac and does not require Terminal after installation.

This development build is unsigned. It opens on the Mac where it was built, but a future downloadable build will need Apple Developer signing and notarization before it is shared publicly.

The generated application and DMG stay in the ignored `release/` directory and are not pushed to the public repository. Their source and repeatable build commands are version-controlled.

## Developer quick start

Prerequisites: Node.js 22.5+, pnpm 10.14+, and FFmpeg 7+ for slideshow generation.

```bash
pnpm install
pnpm dev
```

Open the operator view at `http://localhost:5173/?surface=operator`. On an iPad using the same local network, replace `localhost` with this Mac's local network address and open `/?surface=customer`.

Useful checks:

```bash
pnpm test        # workflow rules
pnpm build       # production type-check and build
pnpm check       # lint, test, and build together
pnpm smoke       # full synthetic session; requires the Host to be running
pnpm package:mac # create the local double-clickable Mac application
```

Generated photos and the local database stay under the ignored `data/` directory. The supplied artwork and color map are documented in [assets/brand/README.md](assets/brand/README.md). See [AGENTS.md](AGENTS.md) for the code map and development rules.
