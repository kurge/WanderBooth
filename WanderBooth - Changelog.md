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

This note records material changes to WanderBooth's product definition and documentation. Source-code release changes will move to the dedicated WanderBooth repository after it is created.

The format follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versions.

## Unreleased

### Pending decisions

- First Windows computer
- First supported camera after comparing the Canon EOS 60D and Fujifilm X-M5
- iPad model and iPadOS version
- Offline-router approach
- Confirmation that guests may join the WanderBooth Wi-Fi network
- Whether 30-day QR access must work away from the booth network, which would require a minimal cloud delivery service
- Initial products, prices, print sizes, layouts, and designs
- Retake allowance
- First live-pilot date
- Public-repository software-license decision

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
