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
- Product-plan version: **0.5.1 — Display and Capture-Count Rules**
- Development status: **Discovery; coding has not started**
- Immediate next step: confirm the first pilot computer, then prove the shared capture interface with the Fujifilm X-M5, a generic webcam/built-in camera, and the iPad camera.
- Source-code repository: **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**
- Repository visibility: **Public**

> [!warning] Public-repository safety
> The WanderBooth repository is public. Never commit customer photos, session databases, payment data, passwords, API keys, local backups, diagnostic exports, or private business records. The project folder is a separate nested Git repository so it does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.
