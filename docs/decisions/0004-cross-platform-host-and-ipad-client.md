# ADR 0004: Cross-Platform Desktop Host and iPad Client

- Status: Accepted
- Date: 2026-10-02
- Supersedes: ADR 0001

## Decision

WanderBooth will use an installable desktop Host targeting Windows 11 and macOS Sequoia 15.7.5 or later. The iPad Pro will run the customer-facing web interface over a shared local Wi-Fi or hotspot connection. One exact computer and operating system will be certified for the first pilot before the second desktop target is validated.

Shared product and interface code will remain cross-platform. Camera control, printing, startup, permissions, and file locations will use operating-system-specific adapters.

## Why

- The business wants WanderBooth available on both Windows PCs/laptops and Macs.
- Electron, React, TypeScript, and SQLite can provide a shared desktop foundation.
- Manufacturer information shows the Fujifilm X-M5 tether application and Epson L8050 printing workflows on both target operating systems.
- Certifying one concrete setup first limits the reliability risk of supporting two hardware environments at once.
- The iPad remains a focused touch client and does not need camera or printer drivers.

## Trade-offs

- Camera, permissions, print queues, packaging, signing, and startup behavior still require separate OS testing.
- The first pilot may ship on only one of the two targets even though the architecture supports both.
- The Host and iPad require a dependable shared connection and automatic reconnect behavior.
