---
title: WanderBooth - Changelog
aliases:
  - WanderBooth Changelog
tags:
  - wanderbooth
  - changelog
status: active
created: 2026-10-01
updated: 2026-10-02
---

# WanderBooth — Changelog

This note records material changes to WanderBooth's product definition, application, and documentation.

The format follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versions.

## Unreleased

### Pending decisions

- Normal Host/iPad connection: venue Wi-Fi, mobile hotspot, or phone hotspot
- PHP price for the first double-strip print
- Source of the final 5–10 production design assets
- Exact first live-pilot month or event

## 1.2.0 — 2026-10-02

### Changed

- Split every custom-frame photo adjustment into **Holder** and **Image** controls. Holder moves and scales the entire masked photo area; Image changes only the crop inside it.
- Made transparent PNG/WebP artwork with owner-prepared photo openings the normal import path. The frame stays above the photos, and the operator is no longer asked to create automatic cutouts during import.
- Kept the legacy flat-template format readable so existing local test designs continue to work.

### Added

- Added authoritative per-capture holder transforms alongside the existing frame and image transforms. Repeated double-strip copies share the same holder and image adjustments.
- Added full-resolution holder positioning and clipping in the Host renderer, including safe cropping when a moved or enlarged holder extends past the canvas.
- Added ADR 0012 documenting the holder/image model, transparent-frame rendering order, permissions, and backward-compatibility decision.

### Fixed

- Stopped filled landscape capture cards from stretching to the height of empty portrait placeholders, removing the large white area below captured photos.
- Kept the final transparent artwork above every transformed photo in both the responsive preview and 300-DPI export.

### Verified

- Confirmed all 22 automated tests, formatting, type checks, Host build, and customer-app build pass.
- Imported a synthetic 1200×1800 transparent frame in an isolated runtime, completed a three-photo Double strip session, and verified separate Photo 1 Holder (120%) and Image (110%) values.
- Rendered and visually inspected the resulting 1200×1800 PNG, confirming that the transparent frame remained above both repeated photo copies and that the independent transforms reached the final file.

## 1.1.0 — 2026-10-02

### Changed

- Replaced the combined color-plus-custom-overlay choice with two explicit, mutually exclusive frame modes: **Fixed colored frame** or **Imported custom frame**.
- Fixed-color mode exposes the color palette and optional compatible built-in decorations. Custom mode hides colors and shows only imported frames for the selected layout.
- Made the finished composite the primary review preview and moved full-aspect, uncropped source captures into a separate retake panel.

### Added

- Added an operator-only composition editor for imported frames. Staff can select the frame or an individual photo, drag it, zoom from 50–300%, and reset it.
- Added authoritative normalized frame and per-capture transforms that persist in SQLite and are applied again by the full-resolution Host renderer.
- Stored normalized custom-frame source artwork beside its derived preview so repeated alignment does not degrade or compound earlier cutouts.
- Added ADR 0011 documenting the composition model, permissions, data flow, bounds, and trade-offs.

### Verified

- Confirmed all 22 automated tests, formatting, type checks, Host build, and customer-app build pass.
- Imported the supplied Sample Template 1 into an isolated runtime, completed a three-photo session, verified the side-by-side final-layout and uncropped-source review, changed Photo 1 zoom, and confirmed the transform persisted.
- Rendered and visually inspected the resulting 1200×1800 custom double-strip PNG and generated the three branded individual photos plus looping MP4 slideshow.

### Fixed

- Removed the forced 3:4 `cover` crop from captured-photo review cards so the review accurately shows the full saved camera image.
- Made a production client connect back to the port that served it, while retaining port 4174 for the Vite development client.

## 1.0.0 — 2026-10-02

### Added

- Added an operator-only **Import an event frame** tool after layout selection.
- Added PNG, JPEG, and WebP uploads up to 25 MB with local persistence across app restarts.
- Added **Flat template** mode, which automatically clears the selected layout's rectangle, rounded, or heart-shaped photo openings from opaque artwork.
- Added **Transparent artwork** mode for production overlays that already contain clear photo openings.
- Added imported-frame thumbnails, layout compatibility filtering, immediate selection after import, and review-time selection.
- Added ADR 0010 documenting local storage, validation, rendering order, and current authentication trade-offs.

### Verified

- Confirmed all 18 automated tests, formatting, type checks, Host build, and customer-app build pass.
- Imported the supplied 1200×1800 Sample Template 1 as a flat Double strip 4×6 frame in an isolated runtime.
- Completed a full three-photo session and visually confirmed that both repeated strips appear inside the automatically cut openings while the imported black/red artwork remains above the photos.

### Safety

- Imported designs stay under private ignored runtime data and are never copied into the public repository.
- Wrong aspect ratios, unsupported types, empty uploads, oversized files, and opaque images submitted in transparent-artwork mode are rejected with readable messages.

## 0.9.0 — 2026-10-02

### Added

- Added a product menu for the existing three-photo strip and a new four-photo 4×6 card family.
- Added five selectable layouts: Classic 2×6, Double strip 4×6, Feature portrait, Heart feature, and Party landscape.
- Added five independent frame palettes and four optional foreground-overlay choices.
- Added data-driven canvas sizes, photo-slot coordinates, capture-index reuse, multiple branding areas, portrait/landscape output, and rectangle/rounded/heart clipping.
- Added compatibility filtering so only overlays designed for the selected layout appear.
- Added review-time frame and overlay changes without requiring new captures.
- Added a configurable smoke runner that can validate three- or four-photo catalog combinations.
- Added template-authoring documentation and ADR 0009.

### Verified

- Rendered and visually inspected the 1200×1800 double-strip sheet with three captures repeated into two identical cut strips, duplicated branding, cut guide, and film overlay.
- Rendered and visually inspected the four-photo Heart feature layout with a true heart-shaped fourth-photo mask and Love hearts overlay.
- Verified the operator menu exposes both product families, filters their layouts, updates the automatic count, and enables only compatible overlays.
- Confirmed all 13 workflow tests, formatting, type checks, Host build, and customer-app build pass.

### Sample-template finding

- Inspected all six supplied sample PNGs. They are flattened RGB reference images with no alpha channel and some contain baked-in example subjects, so they were not copied into the public repository or treated as production overlays. Their geometry informed the built-in catalog.

## 0.8.0 — 2026-10-02

### Confirmed

- One tap starts all three photos for the current product.
- A three-second countdown runs before every initial photo and retake.
- The customer preview is mirrored, while saved and delivered photos remain unmirrored.
- The first physical print is one 4×6 sheet containing two identical vertical 2×6 strips.

### Added

- Added a Host-authoritative countdown and automatic sequence so every connected screen shows the same photo number and timer.
- Added an in-memory 960×540 MacBook-camera preview relay for the customer screen without saving preview frames to disk.
- Added automatic progression from one successful capture to the next and countdown-based selected-slot retakes.
- Added a staff-only **Cancel session** control that safely clears an active countdown or capture and returns the booth to idle.
- Added ADR 0008 documenting the preview, capture, synchronization, and failure boundaries.

### Verified

- Completed an automatic three-photo sequence with the packaged Mac app and starting FaceTime HD Camera.
- Confirmed the customer client received the mirrored live preview and synchronized countdown over the local network.
- Confirmed the Host stored all three 1920×1080 captures in the correct slots and generated the existing five deliverables.
- Confirmed the simulator smoke test completes the same one-tap three-photo sequence.

## 0.7.0 — 2026-10-02

### Added

- Added a staff-only MacBook camera source with explicit enablement, macOS/Electron permission controls, mirrored live preview, detected-device selection, and 1920×1080 JPEG capture.
- Added pending-capture identity so the Host accepts only the expected session, photo slot, and revision and rejects stale uploads.
- Added a packaged-Host customer page and a live local Safari address in the operator sidebar.
- Added plain-language iPad setup instructions for Safari Self-Service and Sidecar Attendant-Operated display use.
- Added state migration for existing local Phase 0 databases and kept the selected source across booth resets.

### Verified

- Completed one packaged three-photo session using the starting MacBook's FaceTime HD Camera.
- Confirmed all three real captures reached the correct slots at 1920×1080 and produced three branded individual files, the 2×6 strip, and the looping slideshow.
- Confirmed the packaged Host serves the customer application over the current LAN address.
- Kept the MacBook source labeled Experimental pending the full 50-session, recovery, crop, lighting, and print-quality test.

## 0.6.1 — 2026-10-02

### Fixed

- Closed the gap between a developer-only Electron command and an application the owner can actually open. WanderBooth now builds as a double-clickable Apple-silicon `.app` and normal Mac DMG.
- Made slideshow generation find the existing Homebrew FFmpeg binary even when WanderBooth launches from Finder without a Terminal PATH.

### Added

- Imported all seven owner-supplied Wander Press PH source PNGs with descriptive filenames while preserving their pixels and original 6000×6000 resolution.
- Documented the measured brand palette and asset usage rules.
- Applied the supplied splash mark and brand colors to the operator and customer interfaces, prototype designs, and simulated photos.
- Added repeatable `package:mac` and `package:mac:dmg` commands, application metadata, a camera privacy explanation, and a local app icon.

### Verified

- Launched the packaged application by opening `WanderBooth.app`; the local Host connected successfully.
- Completed the packaged-app smoke session, including three branded photos, the 2×6 strip, and slideshow.
- Verified the generated DMG checksum.

### Known distribution boundary

- The current Mac build is unsigned and intended for the starting development Mac. Public distribution requires Apple Developer signing and notarization.

## 0.6.0 — 2026-10-02

### Confirmed

- Phase 0 starts on the local MacBook Pro (Mac15,6), Apple M3 Pro with 11-core CPU, 18 GB memory, and macOS 15.7.5.
- The MacBook camera is the first real camera adapter; the Fujifilm X-M5 is the first dedicated-camera integration target.
- The first implemented product is a three-photo vertical 2×6 strip shown on the iPad customer screen.
- Price remains off-screen and can be presented on a physical menu.
- Placeholder visuals use an original lemon-yellow, royal-blue, and pastel WanderBooth treatment informed by Wander Press PH.

### Added

- React operator and customer surfaces for Attendant-Operated and Self-Service modes.
- A local WebSocket Host, SQLite state/event persistence, and server-enforced permissions.
- A safe synthetic camera adapter for developing the full session before real-camera integration.
- Cash-before-capture, product/layout-derived capture count, two retakes, review, design change, approval, and synchronized displays.
- Rendering for three branded individual PNGs, a 600×1800-pixel 2×6 strip at 300 DPI, and an MP4 slideshow.
- Unit tests, a repeatable end-to-end smoke session, linting, formatting, production builds, and developer documentation.

### Deferred from this checkpoint

- Real MacBook and Fujifilm capture, Epson L8050 print submission, private cloud upload, QR generation, 30-day delivery/cleanup, and a production owner area.

## 0.5.1 — 2026-10-02

### Confirmed

- The iPad is the first Self-Service touchscreen; a future dedicated touchscreen will use the same responsive customer interface.
- Attendant-Operated mode supports either the iPad/touchscreen in display-only mode or a normal second monitor.
- Captured photos are shown on the attended customer display.
- A customer may verbally request a replacement, but only the operator performs the photo replacement or retake.
- Required photo count comes automatically from the selected product/layout and is not a separate operator or customer choice.

### Changed

- Removed photo-count selection screens and commands from both operation modes.
- Added product/layout capture-count configuration and a required-photo summary before payment and capture.
- Generalized the customer client so it is not tied to the current iPad's exact screen size.
- Removed the three resolved operation-mode questions from the Phase 0 decision list.

## 0.5.0 — 2026-10-02

### Confirmed

- WanderBooth supports Attendant-Operated and Self-Service modes.
- The owner or attendant chooses the mode while the booth is idle; customers cannot change it.
- In Attendant-Operated mode, the laptop operator controls product, layout, photo count, design/style, capture, photo replacement/retake, and final approval.
- The attended customer-facing screen is read-only.
- In Self-Service mode, customers can choose owner-approved products, layouts, photo counts, and designs and can perform allowed review actions.
- Camera selection, cash confirmation, refunds, reprints, recovery, and administration remain staff-only in both modes.
- Self-Service still requires staff cash confirmation in version 1 and is not yet fully unattended.

### Added

- Separate operator-console, display-only, and interactive Self-Service screen definitions.
- Server-enforced actor permissions and per-action audit ownership.
- Safe mode switching only while idle or after audited cancellation/recovery.
- Photo-slot replacement, compatible style changes, final approval, and post-print reprint rules.
- Dual-mode acceptance tests and synchronization requirements.
- Operation-mode guide and ADR 0007.

### Changed

- Replaced the earlier generic “customer selection with attendant assistance” flow with two explicit control models.
- Clarified that “Self-Service” describes creative-flow control, not unattended cash handling.

## 0.4.1 — 2026-10-02

### Confirmed

- Camera-source selection is available only to the owner or attendant.
- Customers cannot view or change the active camera source; they see only the normal preview, countdown, and capture flow.

## 0.4.0 — 2026-10-02

### Confirmed

- WanderBooth will not be tied to a single camera brand or model.
- An owner or attendant can choose among supported camera sources.
- Source types include DSLR/mirrorless cameras, USB/UVC webcams, built-in computer cameras, and the iPad camera.
- Additional camera brands and models can be added through replaceable adapters and tested compatibility profiles.

### Changed

- Replaced the one-agreed-camera requirement with a shared camera-source contract.
- Expanded the Phase 0 proof of concept to cover a dedicated camera, a webcam/built-in camera, and the iPad camera through the same session workflow.
- Reframed the Fujifilm X-M5 as the first recommended dedicated camera to certify, not the only camera WanderBooth supports.

### Added

- Staff-only camera-source selection and test preview.
- Per-source capabilities, readiness, saved settings, and compatibility labels.
- Certified, Experimental, and Unavailable compatibility states.
- Recovery rules that prevent WanderBooth from silently changing cameras after payment.
- ADR 0006 documenting the selectable camera-source architecture.
- A camera compatibility matrix for tracking exact source/OS/product certification.

## 0.3.0 — 2026-10-02

### Confirmed

- Desktop Host target is Windows 11 and macOS Sequoia 15.7.5 or later; one exact pilot computer will be certified first.
- The customer touchscreen is an iPad Pro 12.9-inch (6th generation) running iPadOS 18.2.
- Cash is collected and confirmed before capture.
- Each customer receives up to two retakes.
- Initial print formats are 4×6 and 2×6 strips, with approximately 5–10 initial layouts/designs.
- Guests do not need to join WanderBooth Wi-Fi.
- QR links use cloud delivery, work away from the booth, and expire after 30 days.
- A three-photo strip session includes three separately downloadable branded photos, the final branded strip, and a looping slideshow video showing each photo for about 1.5 seconds.
- A dedicated travel router is optional, not required for the first pilot.
- The public repository remains under default copyright for now.

### Changed

- Reframed offline-first behavior around uninterrupted capture, local saving, processing, and printing, with a persistent cloud-upload queue for delivery outages.
- Moved the minimal cloud QR service into P0 while keeping the full products, pricing, sales, and support dashboard deferred.
- Expanded the Host architecture from Windows-only to a cross-platform Windows/macOS desktop core with OS-specific hardware adapters.
- Recommended the Fujifilm X-M5 for the first focused camera prototype instead of requiring a comparison of both owned cameras.
- Replaced local guest-Wi-Fi downloads with private cloud delivery over the customer's own internet connection.

### Added

- Upload states, retry behavior, private cloud storage requirements, 30-day cloud cleanup, and pending-delivery recovery.
- Concrete multi-photo deliverables and slideshow format.
- Architecture decisions for cross-platform hosting and cloud QR delivery.

## 0.2.0 — 2026-10-02

### Confirmed

- The first pilot sells both branded digital photos and physical prints.
- The first pilot uses attendant-confirmed cash payments; online payments are deferred.
- The booth should support attended and future unattended operation.
- Customers may choose a product, layout, and design, with operator assistance available.
- The Windows PC or laptop acts as the hardware Host and the iPad acts as the customer touchscreen.
- Owned cameras are the Canon EOS 60D and Fujifilm X-M5.
- The first printer is the Epson EcoTank L8050.
- Customer QR access expires after 30 days.
- Local photo backups are retained for 30 days.
- Customers receive the final branded photo only.
- The public repository is `kurge/WanderBooth`.

### Changed

- Replaced the single-device desktop concept with a Windows Host plus local iPad web client.
- Replaced electronic-payment P0 requirements with a cash-confirmation workflow.
- Made printing a confirmed first-pilot feature.
- Moved QR Ph, GCash, Maya, and card payments to P1.
- Added layout and design selection to the customer flow.
- Updated risks, development phases, Git rules, and remaining owner questions.

### Added

- Hardware baseline and test plan.
- Architecture decision records for the Host/iPad split, cash-only pilot, and public-repository safety.
- Public-repository `.gitignore` protections for customer and operational data.

## 0.1.0 — 2026-10-01

### Added

- Established the product name **WanderBooth**.
- Defined the product as an offline-first photo booth application for internal business use.
- Defined Windows PCs and laptops as the proposed first platform.
- Defined QR photo delivery as a core feature.
- Described online and offline QR delivery flows.
- Proposed a local owner area before building a remote web dashboard.
- Prioritized features into P0, P1, P2, and explicit non-goals.
- Proposed an Electron, React, TypeScript, SQLite, and local-server architecture.
- Added phased development and reliability gates.
- Added privacy, security, risk, and recovery requirements.
- Added a GitHub and semantic-versioning workflow.
- Added blocking owner questions and a plain-language glossary.
