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
- [Layouts, frames, and overlays](docs/TEMPLATES_AND_OVERLAYS.md) — the template model, current catalog, supplied-sample findings, and production artwork rules.
- [iPad setup](docs/IPAD_SETUP.md) — Safari touchscreen and Sidecar second-display instructions.
- [Architecture decision records](docs/decisions/) — short records explaining why major technical and product choices were made.

## Current project state

- Product name: **WanderBooth**
- Product-plan version: **1.6.0 — Freeform Custom Templates**
- Development status: **Phase 0 working prototype**
- Starting Host: **MacBook Pro (Mac15,6), Apple M3 Pro, 18 GB memory, macOS 15.7.5**
- Current catalog: **two normal product families with five built-in layouts, plus portrait and landscape custom saved templates with up to eight holders**, a mutually exclusive fixed-color or imported event frame, iPad customer screen, and no on-screen price
- Current cameras: **prototype simulator and experimental MacBook camera**, now with a relayed customer-screen preview and automatic capture sequence; Fujifilm X-M5 is the first dedicated-camera target
- First print decision: **one 4×6 sheet containing two three-photo 2×6 strips with six unique shots**; the renderer now produces this file, but printer submission is not implemented
- Immediate next step: prepare and approve the first production designs in the Template Gallery on the physical iPad/Mac workflow, then test the Epson L8050 print path. Private 30-day cloud QR delivery follows.
- Source-code repository: **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**
- Repository visibility: **Public**

> [!warning] Public-repository safety
> The WanderBooth repository is public. Never commit customer photos, session databases, payment data, passwords, API keys, local backups, diagnostic exports, or private business records. The project folder is a separate nested Git repository so it does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.

## What works in the Phase 0 prototype

- One synchronized session shared by the laptop operator view and iPad/customer view.
- Staff-selected Attendant-Operated or Self-Service control.
- Product/layout menu with built-in three-photo, four-photo, and six-photo arrangements; saved custom templates derive one to eight automatic captures from their holder labels.
- Five data-driven layouts: classic 2×6, six-shot double strip 4×6, feature portrait, heart feature, and party landscape.
- Five reusable fixed-color frames with optional no-overlay, film-edge, confetti, and heart treatments.
- A mutually exclusive imported-frame path: selecting a custom frame hides and clears fixed colors, while selecting a color clears the custom frame.
- Operator-only event-frame import for transparent PNG artwork with pre-cut photo openings. The Host preserves a normalized source plus a rendered preview so later alignment is lossless and survives restart; previously imported flat templates remain readable.
- A persistent staff-only Template Gallery: upload or reuse artwork, align numbered photo placeholders before service, save the complete product/layout/frame/holder/crop setup, update it or save a copy, and delete it without destroying shared artwork.
- Portrait and landscape custom 4×6 template canvases with one to eight independently editable holders. Each holder maps to Capture 1–8, and the same capture can fill several holders without sharing their placement or crop settings.
- One-tap approved-template selection at the start of a session. Real captures automatically fill the saved numbered positions, while the existing review editor remains available for session-specific staff adjustments.
- Rectangle, rounded, heart-shaped, portrait, and landscape rendering.
- Cash confirmation before capture, with no price shown in the application.
- Two retakes, full uncropped source-photo review, a final composed-layout preview, and final approval.
- Operator-only direct composition canvas for imported frames: click the artwork or a photo frame, drag it in place, use corners for proportional scaling, use middle edge handles to reshape the crop frame without stretching the photo, rotate it from the round handle, enter Crop image mode to reposition or proportionally scale the capture, and lock finished objects. There is no zoom slider. The precise stored adjustment is rendered into the final file.
- Separate confirmed deletion for saved templates and imported artwork. Artwork referenced by a saved template is protected from deletion so gallery items cannot break silently.
- Captured and waiting review cards share the same 16:9 footprint while preserving the full source image with `contain` fitting.
- Local SQLite state and event history so the Host remains authoritative.
- A layout-defined set of branded individual PNGs, a 300-DPI composite strip/card, and an MP4 slideshow.
- Synthetic camera output for safe development without customer images.
- Staff-only simulator/MacBook source selection, local preview relay to the customer screen, and full-resolution local Host transfer.
- One-tap automatic layout-defined capture, from one to eight photos, with a Host-controlled three-second countdown before every photo.
- Mirrored live preview for posing, unmirrored saved photos, countdown-based retakes, and a staff-only session-cancel safety control.
- A customer URL served by the packaged Host for a real touch-controlled iPad Safari screen.
- A double-clickable Apple-silicon Mac application and local DMG build.
- Supplied Wander Press PH artwork and exact blue, lime, yellow, cream, orange, and purple brand tokens.

The prototype now controls the starting MacBook camera, provides a reusable Template Gallery, and imports owner artwork locally, but it does **not** yet control the X-M5, submit jobs to the Epson L8050, upload to cloud storage, or generate the private 30-day QR page. The built-in camera remains Experimental until the full reliability and print-quality test is complete.

## Open the app on this Mac

The current local installation image is generated at `release/WanderBooth-0.11.0-arm64.dmg`. Double-click it in Finder, then drag **WanderBooth** into **Applications**. This build is for the current Apple-silicon Mac and does not require Terminal after installation.

This development build is unsigned. It opens on the Mac where it was built, but a future downloadable build will need Apple Developer signing and notarization before it is shared publicly.

The generated application and DMG stay in the ignored `release/` directory and are not pushed to the public repository. Their source and repeatable build commands are version-controlled.

## Developer quick start

Prerequisites: Node.js 22.5+, pnpm 10.14+, and FFmpeg 7+ for slideshow generation.

```bash
pnpm install
pnpm dev
```

Open the operator view at `http://localhost:5173/?surface=operator`. The packaged app shows the full iPad Safari address in its sidebar. Development mode uses this Mac's local network address on port `5173`; the packaged app uses port `4174`.

Useful checks:

```bash
pnpm test        # workflow rules
pnpm build       # production type-check and build
pnpm check       # lint, test, and build together
pnpm smoke       # full synthetic session; requires the Host to be running
pnpm package:mac # create the local double-clickable Mac application
```

Generated photos and the local database stay under the ignored `data/` directory. The supplied artwork and color map are documented in [assets/brand/README.md](assets/brand/README.md). See [AGENTS.md](AGENTS.md) for the code map and development rules.
