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
updated: 2026-10-06
---

# WanderBooth

WanderBooth is an offline-first photo booth application being developed for our own photo business. It supports two staff-selected workflows: **Attendant-Operated**, where staff control the session from the laptop and the customer display is read-only, and **Self-Service**, where the customer chooses from owner-approved products, layouts, and designs on the touchscreen. The selected product/layout automatically determines how many photos are required. The first touchscreen is an iPad; a future dedicated touchscreen can use the same interface. Attended sessions can use either the iPad or a normal second monitor as the customer display. The desktop Host will target Windows 11 and macOS Sequoia 15.7.5 or later. Operators can select among supported dedicated cameras, USB webcams, the computer's built-in camera, or the iPad camera. WanderBooth will sell both branded digital photos and physical prints, accept attendant-confirmed cash payments, and let customers retrieve their completed photos and looping slideshow from a private 30-day cloud link by scanning a QR code.

## Project documents

- [Product plan and feature specification](<WanderBooth - Product Plan and Feature Specification.md>) — product direction, customer flow, features, architecture, roadmap, risks, and open questions.
- [Changelog](<WanderBooth - Changelog.md>) — chronological record of material documentation and product-plan changes.
- [Hardware baseline](docs/HARDWARE.md) — owned devices, known compatibility, risks, and the Phase 0 hardware test plan.
- [Camera compatibility matrix](docs/CAMERA_COMPATIBILITY.md) — camera sources, adapter types, test status, and product-level approval.
- [Fujifilm X-M5 tether pilot](docs/FUJIFILM_XM5_TETHER.md) — attended fallback plus hybrid HDMI-preview/USB-capture setup, testing, and recovery.
- [Operation modes](docs/OPERATION_MODES.md) — control ownership, screen behavior, permissions, and workflows for Attendant-Operated and Self-Service use.
- [Events and local storage](docs/EVENTS_AND_STORAGE.md) — event projects, session history, local file ownership, archive/delete behavior, and the boundary with 30-day cloud delivery.
- [Cloud QR delivery](docs/CLOUD_QR_DELIVERY.md) — Cloudflare setup, operator workflow, security, retention, recovery, and deployment.
- [Printing and photo filters](docs/PRINTING_AND_FILTERS.md) — manual print-preview flow, 4×6/2×6 sheet rules, print history, six local filters, and future AR options.
- [Layouts, frames, and overlays](docs/TEMPLATES_AND_OVERLAYS.md) — the template model, current catalog, supplied-sample findings, and production artwork rules.
- [iPad setup](docs/IPAD_SETUP.md) — Safari touchscreen and Sidecar second-display instructions.
- [Architecture decision records](docs/decisions/) — short records explaining why major technical and product choices were made.

## Current project state

- Product name: **WanderBooth**
- Product-plan version: **1.9.3 — X-M5 Hybrid Capture Adapter**
- Development status: **Phase 0 working prototype**
- Starting Host: **MacBook Pro (Mac15,6), Apple M3 Pro, 18 GB memory, macOS 15.7.5**
- Current catalog: **two normal product families with five built-in layouts, plus portrait and landscape custom saved templates with up to eight holders**, a mutually exclusive fixed-color or imported event frame, iPad customer screen, and no on-screen price
- Current cameras: **prototype simulator, experimental video-device capture, attended Fujifilm X-M5 folder import, and experimental X-M5 Hybrid**. Hybrid uses a selected video input for live view and direct USB for automatic full-resolution X-M5 stills; final X-M5 live view awaits an HDMI/UVC capture device.
- First print decision: every job uses an Epson-compatible **4×6 sheet**. A single 2×6 design is duplicated on both halves for cutting; the six-shot Double strip already fills the whole 4×6 sheet.
- Immediate next step: connect the X-M5's HDMI Micro (Type D) output to a UVC capture device, choose that input inside X-M5 Hybrid, and run the six-capture/retake/recovery gate. Epson L8050 printing has passed its first physical workflow test; exact color, scale, and borderless settings still need a repeatable pilot preset. AR remains a later adapter-backed experiment.
- Source-code repository: **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**
- Repository visibility: **Public**

> [!warning] Public-repository safety
> The WanderBooth repository is public. Never commit customer photos, session databases, payment data, passwords, API keys, local backups, diagnostic exports, or private business records. The project folder is a separate nested Git repository so it does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.

## What works in the Phase 0 prototype

- Experimental Mac-only **Canon EOS 60D · USB** source with live preview, an automatic full-resolution test photo, and Host-triggered sessions/retakes. Software is implemented; the real camera still needs validation. See [Canon setup](docs/CANON_EOS_USB.md).
- A local event library is now the operator's starting point. Staff can create, reopen, archive, restore, and permanently delete event projects with dates, client/venue details, notes, and a starting template folder.
- Every completed customer session is numbered inside its event and keeps its optional customer/group name, captures, final branded files, and slideshow in an event-specific local folder. Local events remain until the operator deliberately deletes them.
- A reusable master Template Library supports named folders such as Weddings or Birthdays. One master template may belong to several folders; creating an event copies the selected folder's templates into an isolated event set.
- Event-template edits affect only that event. Staff can add another master later or deliberately promote an event-specific design back into chosen library folders without changing completed sessions.
- One synchronized session shared by the laptop operator view and iPad/customer view.
- Staff-selected Attendant-Operated or Self-Service control.
- Product/layout menu with built-in three-photo, four-photo, and six-photo arrangements; saved custom templates derive one to eight automatic captures from their holder labels.
- Five data-driven layouts: classic 2×6, six-shot double strip 4×6, feature portrait, heart feature, and party landscape.
- Five reusable fixed-color frames with consistent selection highlights, plus imported custom artwork. Built-in decorations are retired; per-photo filters remain available during review.
- A mutually exclusive imported-frame path: selecting a custom frame hides and clears fixed colors, while selecting a color clears the custom frame.
- Operator-only event-frame import for transparent PNG artwork with pre-cut photo openings. The Host preserves a normalized source plus a rendered preview so later alignment is lossless and survives restart; previously imported flat templates remain readable.
- A persistent staff-only Template Library: upload or reuse artwork, align numbered photo placeholders before service, save the complete product/layout/frame/holder/crop setup, assign it to folders, update it or save a copy, and delete it without destroying shared artwork.
- Portrait and landscape custom 4×6 template canvases with one to eight independently editable holders. Each holder maps to Capture 1–8, and the same capture can fill several holders without sharing their placement or crop settings.
- One-tap approved-template selection at the start of a session. Real captures automatically fill the saved numbered positions, while the existing review editor remains available for session-specific staff adjustments.
- Rectangle, rounded, heart-shaped, portrait, and landscape rendering.
- Cash confirmation before capture, with no price shown in the application.
- Two retakes, full uncropped source-photo review, a final composed-layout preview, and final approval.
- Six per-photo, non-destructive local filters after capture: Original, B&W, Warm, Cool, Vintage, and High Contrast. The preview uses a fast browser approximation, while Sharp renders the selected look into every final photo, layout, slideshow, and print.
- Operator-only direct composition canvas for imported frames: click the artwork or a photo frame, drag it in place, use corners for proportional scaling, use middle edge handles to reshape the crop frame without stretching the photo, rotate it from the round handle, enter Crop image mode to reposition or proportionally scale the capture, and lock finished objects. There is no zoom slider. The precise stored adjustment is rendered into the final file.
- Separate confirmed deletion for saved templates and imported artwork. Artwork referenced by a saved template is protected from deletion so gallery items cannot break silently.
- Captured and waiting review cards share the same 16:9 footprint while preserving the full source image with `contain` fitting.
- Local SQLite state and event history so the Host remains authoritative.
- A layout-defined set of branded individual PNGs, a 300-DPI composite strip/card, and an MP4 slideshow.
- A dedicated 300-DPI 4×6 print file for every completed session, including duplicated matching 2×6 strips when the guest selected the single-strip product.
- Operator print preview from the completion screen or event history, followed by the native macOS/Windows print dialog. Self-Service completion raises an operator banner and audible ding, and every print-dialog outcome is saved in session history where Electron can report it.
- A stable, private QR link for every completed session. The operator and customer screens render the QR locally, show queued/uploading/ready/failed/expired status honestly, and event history can re-display or retry it.
- A persistent background upload queue that survives restart and sends only branded individual photos, the final layout, and the looping slideshow. Capture, local processing, and printing remain available if internet access fails.
- A minimal Cloudflare Worker delivery service using private R2 media, D1 delivery records, an authenticated Host API, a mobile guest gallery, and hourly cleanup after the exact 30-day access window.
- Synthetic camera output for safe development without customer images.
- Staff-only simulator/MacBook source selection, local preview relay to the customer screen, and full-resolution local Host transfer.
- An Experimental X-M5 Hybrid source that keeps a standard video input live for posing while the Host fires the X-M5 over USB, downloads its full-resolution JPEG automatically, retains JPEG and RAW copies on the camera, and advances the session without an attendant touching the shutter.
- One-tap automatic layout-defined capture, from one to eight photos, with a Host-controlled three-second countdown before every photo.
- Mirrored live preview for posing, unmirrored saved photos, countdown-based retakes, and a staff-only session-cancel safety control.
- A customer URL served by the packaged Host for a real touch-controlled iPad Safari screen.
- A double-clickable Apple-silicon Mac application and local DMG build.
- Supplied Wander Press PH artwork and exact blue, lime, yellow, cream, orange, and purple brand tokens.

The prototype now controls standard video cameras, imports X-M5 JPEGs through the attended FUJIFILM TETHER APP fallback, and automatically fires/downloads the X-M5 through the new Hybrid source. Hybrid live view intentionally comes from a separate video input because direct USB preview fails after capture on the tested camera/firmware; a clean HDMI/UVC device is still required for production X-M5 posing. The app also provides event workspaces, a reusable Template Library, owner artwork import, native print-dialog preparation, and private QR delivery. Camera and Epson paths remain Experimental until the full reliability and print-quality tests are complete.

## Open the app on this Mac

Run `pnpm package:mac:dmg` to generate `release/WanderBooth-0.17.1-arm64.dmg`, then double-click it in Finder and copy **WanderBooth** into **Applications**. The generated build is for the current Apple-silicon Mac and does not require Terminal after installation. Canon USB and X-M5 Hybrid expect gPhoto2 at a standard Homebrew path on the Host; it is not bundled into the DMG. Canon remains experimental: real live view passed once, but still capture and preview recovery require another physical test.

If the decorative DMG builder reports `hdiutil: create failed - Operation not supported by device` after producing the `.app`, a plain installation image can be created with `hdiutil create -volname 'WanderBooth 0.17.1' -srcfolder release/mac-arm64 -format UDZO release/WanderBooth-0.17.1-arm64.dmg`. Use this only when that output file does not already exist; it contains the app without the drag-to-Applications shortcut.

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
pnpm cloud:dev   # run the private QR service locally
pnpm cloud:deploy # deploy the configured Cloudflare Worker
```

Generated photos and the local database stay under the ignored `data/` directory. The supplied artwork and color map are documented in [assets/brand/README.md](assets/brand/README.md). See [AGENTS.md](AGENTS.md) for the code map and development rules.
