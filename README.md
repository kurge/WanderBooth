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

WanderBooth is an offline-first photo booth application being developed for our own photo business. The first release will use a Windows PC or laptop as the booth host and an iPad as the customer-facing touchscreen. It will sell both branded digital photos and physical prints, accept attendant-confirmed cash payments, and let customers retrieve their completed photo by scanning a QR code.

## Project documents

- [Product plan and feature specification](<WanderBooth - Product Plan and Feature Specification.md>) — product direction, customer flow, features, architecture, roadmap, risks, and open questions.
- [Changelog](<WanderBooth - Changelog.md>) — chronological record of material documentation and product-plan changes.
- [Hardware baseline](docs/HARDWARE.md) — owned devices, known compatibility, risks, and the Phase 0 hardware test plan.
- [Architecture decision records](docs/decisions/) — short records explaining why major technical and product choices were made.

## Current project state

- Product name: **WanderBooth**
- Product-plan version: **0.2.0 — Hardware and Workflow Baseline**
- Development status: **Discovery; coding has not started**
- Immediate next step: answer the remaining Phase 0 questions, then build the camera-to-iPad offline QR proof of concept.
- Source-code repository: **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**
- Repository visibility: **Public**

> [!warning] Public-repository safety
> The WanderBooth repository is public. Never commit customer photos, session databases, payment data, passwords, API keys, local backups, diagnostic exports, or private business records. The project folder is a separate nested Git repository so it does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.
