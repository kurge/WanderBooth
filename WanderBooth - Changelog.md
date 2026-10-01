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

This note records material changes to WanderBooth's product definition and documentation. Application release changes will use this same repository and changelog once coding begins.

The format follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versions.

## Unreleased

### Pending decisions

- First pilot Host OS: Windows 11 or macOS Sequoia 15.7.5+
- Exact first pilot computer model, CPU, memory, and storage
- Owner confirmation of the recommended Fujifilm X-M5 as the first integrated camera
- Normal Host/iPad connection: venue Wi-Fi, mobile hotspot, or phone hotspot
- Initial products, quantities, and PHP prices
- Exact 4×6 layout and confirmation that the three-photo vertical 2×6 strip is the default strip product
- Source of the first 5–10 design assets and branding
- Exact first live-pilot month or event

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
