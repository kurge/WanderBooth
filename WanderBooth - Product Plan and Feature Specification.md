---
title: WanderBooth - Product Plan and Feature Specification
aliases:
  - WanderBooth Product Plan
  - WanderBooth Feature Specification
tags:
  - wanderbooth
  - app
  - product-plan
  - feature-spec
  - offline-first
status: draft
document_version: 0.2.0
created: 2026-10-01
updated: 2026-10-02
owner: Kurge
---

# WanderBooth — Product Plan and Feature Specification

> [!summary] The short version
> WanderBooth will be an offline-first photo booth system for our own business. A Windows PC or laptop will act as the **WanderBooth Host**, controlling the camera, image processing, local storage, and Epson printer. An iPad will provide the customer-facing touchscreen over the booth's private local network. The first pilot will sell both branded digital photos and physical prints, use attendant-confirmed cash payments, and give the customer a private QR code after the session. Products, prices, designs, sessions, and sales will initially be managed locally. A remote web dashboard, electronic payments, and native mobile app can be added later.

## 1. Document purpose

This is the source of truth for what WanderBooth is, what we are building first, and why.

It is written so that a non-developer can understand:

- what the customer will experience;
- what the business owner and booth attendant can control;
- which features are required for the first usable release;
- which features are intentionally postponed;
- how the application will work at a high level;
- how development changes will be documented and versioned; and
- what decisions must be made before coding begins.

When a product decision changes, update this document and record the change in [[WanderBooth - Changelog]].

## 2. Product vision

**WanderBooth makes buying and receiving a professionally branded photo simple, fast, and dependable—even when an event has poor or no internet.**

The product is being built for our own photo business first. It is not initially intended to be a software-as-a-service product for other photo booth operators.

### The problem we are solving

Existing photo booth products contain many useful features, but their printing, connectivity, subscriptions, payment providers, and multi-device setups can introduce unnecessary complexity. We need a focused system that we understand and control ourselves.

Customers should not need to install an application, create an account, or wait for an email. They should finish a photo session, scan a QR code, and save their photo.

The business should be able to keep serving customers during internet interruptions, recover from an application or device restart, and understand exactly what happened when a session fails.

### Product principles

1. **Offline first:** internet loss must not destroy or block a completed photo session.
2. **QR delivery first:** the simplest delivery method is scanning a QR code after the session.
3. **Reliability before novelty:** a successful capture and delivery matters more than AI effects or 360 video.
4. **Local ownership:** original photos and business data are stored locally first, then synchronized when appropriate.
5. **One platform first:** support Windows well before attempting every operating system.
6. **Understandable operations:** error messages, logs, and controls must be readable by a booth attendant who is not a developer.
7. **Privacy by default:** customer photos are private, access links are difficult to guess, and files are automatically removed according to a documented retention policy.

## 3. Decisions and assumptions

### Confirmed decisions

- The product name is **WanderBooth**.
- WanderBooth is initially for our own business.
- The application must be offline-first.
- A Windows PC or laptop will host the camera, processing, storage, and printing functions.
- An iPad will be the customer-facing touchscreen for the first booth.
- The first pilot will sell **both branded digital photos and physical prints**.
- The first pilot will accept **cash only**, confirmed by a booth attendant.
- WanderBooth should support both attended and eventually unattended operation, but the cash-only pilot requires an attendant.
- Customers can choose their product, print layout, and design; the attendant can assist or make the selection for them.
- A customer must be able to retrieve the finished photo through a QR code after the session.
- QR access will expire after **30 days**.
- Local customer-photo backups will be kept for **30 days**.
- The customer receives the **final branded photo only**, not the original capture.
- Available camera hardware: **Canon EOS 60D** and **Fujifilm X-M5**.
- The first printer is an **Epson EcoTank L8050**.
- A remote web dashboard is useful but is not required for the first release.
- Product development must be carefully documented and version-controlled.
- Documentation must remain understandable to a non-developer.
- The public source repository is **[kurge/WanderBooth](https://github.com/kurge/WanderBooth)**.

See [WanderBooth Hardware Baseline](docs/HARDWARE.md) for manufacturer compatibility evidence, risks, and the Phase 0 test matrix.

### Proposed decisions awaiting confirmation

- Version 1 will target **Windows 11** first.
- The Windows computer will run an installable **WanderBooth Host** application and serve the touch-friendly booth interface to the iPad over the local network.
- The Fujifilm X-M5 and Canon EOS 60D will both be tested before selecting the first supported camera. The X-M5 is the leading modern candidate, but direct programmatic shutter control must be proven.
- Essential administration—products, prices, sessions, settings, and local sales—will be inside a PIN-protected owner area.
- A dedicated travel router will provide the booth's local network for reliable offline QR delivery.
- Cash will normally be confirmed by an attendant before capture begins.

### Why the first release uses a Host and iPad client

A normal website running only on an iPad has limited control over desktop printer drivers, tethered cameras, automatic startup, silent printing, USB-device recovery, and local files.

WanderBooth therefore separates the system into two cooperating parts:

1. **WanderBooth Host on Windows:** controls the camera and Epson printer, processes photos, stores sessions, and serves the local application.
2. **WanderBooth Touch on iPad:** shows the customer interface in a full-screen local web app and sends actions to the Host.

This provides the touch experience we want without forcing the iPad to control Windows hardware. It also gives us a path to package the same interface as a native iPad application later if needed.

## 4. Users

### Customer

The person taking and buying the photo. They need a short, obvious, touch-friendly process with no account or application installation.

### Booth attendant

The person helping customers, checking the camera and printer, restarting failed sessions, approving cash transactions, and reprinting when authorized.

### Business owner

The person configuring prices and products, reviewing sales, exporting records, changing branding, checking system health, and managing customer-photo retention.

## 5. Core customer journey

The first pilot uses an attendant-confirmed cash flow. The recommended default is to confirm cash before capture so there is no dispute about whether the session was purchased. The application can support a manager-authorized complimentary session for testing or customer recovery.

```text
Attract screen
     ↓
Choose product/package
     ↓
Choose layout and design, independently or with attendant help
     ↓
Read privacy notice and continue
     ↓
Attendant confirms cash received
     ↓
Live preview and countdown
     ↓
Capture photo(s)
     ↓
Review and limited retake
     ↓
Create final branded photo
     ↓
Print, if purchased
     ↓
Display private download QR code
     ↓
Customer saves photo
     ↓
Session clears and returns to attract screen
```

### Session states

The application must always know the current state of a session. This prevents duplicate charges, missing photos, and duplicate prints.

```text
IDLE
  → PRODUCT_SELECTED
  → DESIGN_SELECTED
  → CONSENTED
  → CASH_PENDING
  → CASH_CONFIRMED
  → CAPTURING
  → REVIEWING
  → PROCESSING
  → PRINT_QUEUED (when applicable)
  → READY_TO_DOWNLOAD
  → FULFILLED
  → RESET
```

Every state must also have a clear failure path, such as `CASH_CANCELLED`, `CAMERA_FAILED`, `PRINT_FAILED`, `REFUND_REQUIRED`, or `RECOVERY_REQUIRED`. Electronic-payment states will be added only when online payments enter scope.

## 6. Offline QR photo delivery

This is a defining WanderBooth feature.

### Customer experience

1. WanderBooth finishes and safely saves the customer's photo.
2. The completion screen displays a QR code.
3. The customer scans the QR code with their phone camera.
4. A simple mobile page opens with the photo and a **Download photo** button.
5. The customer saves the photo; no WanderBooth account or mobile application is required.

### When internet is available

The application can upload the finished photo to secure cloud storage and display an HTTPS download link. The link should:

- contain an unguessable random token;
- display only that session's final deliverable;
- expire automatically;
- avoid exposing other customers' sessions; and
- permit download without collecting unnecessary personal information.

For the first release, online and offline QR access both expire 30 days after the session.

An important limitation remains: a purely local QR link works only while the customer is connected to the WanderBooth network and the Host is running. A link that works from anywhere for the full 30 days requires a small cloud upload/download service, even though the full owner dashboard can remain deferred. Whether that remote 30-day access is required for the first pilot is still an owner decision.

### When internet is not available

The booth creates its own local network using a dedicated router. WanderBooth runs a small local download server on the booth computer.

The customer completes a two-step process:

1. Scan a Wi-Fi QR code to join the WanderBooth guest network.
2. Scan the session QR code to open the private photo-download page hosted by the booth computer.

If the phone is already connected to the WanderBooth network, only the session QR code is needed.

### Offline delivery requirements

- The final image must exist locally before a QR code is shown.
- Each session receives a cryptographically random download token.
- Guessing one token must not reveal another session.
- The download page must work on modern iPhone and Android browsers.
- The page must clearly explain how to join the booth network when the phone is offline.
- Access must expire automatically 30 days after the session.
- The attendant must be able to revoke a session link.
- The local server must start automatically with WanderBooth.
- Router client isolation must be disabled so guest phones can reach the kiosk.
- The Windows firewall rule and local server port must be configured during installation.
- When internet returns, eligible sessions can upload in the background without blocking the current customer.
- Only the final branded deliverable is exposed; original camera files are never included on the customer page.

### Future improvement

A later version can use a captive portal so that joining the WanderBooth Wi-Fi automatically opens a page where the customer enters or scans their session code. This should not delay the first pilot.

## 7. Feature priorities

### P0 — required for the first real pilot

#### Customer-facing booth

- Full-screen attract screen with WanderBooth branding
- Large touch-friendly controls
- Product/package selection
- Clear price display
- Customer-selectable print layout
- Customer-selectable design/theme
- Attendant override or assisted selection
- Short privacy notice and consent action
- Live camera preview
- Configurable countdown
- Single-photo session
- Configurable multi-photo session for photo strips
- Photo review
- One configurable retake
- Processing screen
- Final photo preview
- Offline QR photo delivery
- Online QR delivery when internet is available
- Automatic timeout and safe reset
- English interface; additional languages can follow

#### Local owner and attendant area

- PIN-protected access
- Create, edit, enable, and disable products
- Set local currency and prices
- Assign a layout to each product
- Create, import, enable, and disable branded designs
- Decide which layouts and designs customers may choose
- Configure countdown and retake rules
- Configure QR-access expiration
- Browse completed sessions
- Reopen the latest session
- Re-display a session QR code
- Revoke a download link
- Delete a session according to policy
- View basic daily sales and session counts
- Export session and sales records to CSV
- Run camera, storage, network, and QR-delivery tests
- Export a support/diagnostic package without exposing payment secrets

#### Camera and photo processing

- Support one agreed camera configuration
- Detect a missing camera before the customer pays
- Reconnect after a temporary camera interruption
- Save the original photo before processing
- Crop, rotate, and resize without distorting the image
- Apply a branded frame or overlay
- Generate full-resolution and phone-friendly versions
- Generate the agreed Epson L8050 print layouts; initial paper sizes remain to be confirmed
- Store every session in a predictable local folder structure

#### Local data and recovery

- SQLite local database
- Unique session and order identifiers
- Persistent state after application restart
- No lost completed photo after a crash
- Automatic startup with Windows
- Kiosk lock so customers cannot exit into Windows
- Storage-capacity warning
- Automatic retention cleanup with an audit record
- Daily local backup to a separately configured location

#### Cash payment for the first pilot

- PHP product prices
- Attendant-only **Cash received** confirmation protected by PIN or staff mode
- Record amount due, amount received, and calculated change
- Cancel an unpaid order without creating a session
- Manager-authorized complimentary or recovery session with a required reason
- Manual cash refund marker and notes
- End-of-day cash sales summary
- Prevent one cash confirmation from fulfilling more than one order
- No online payment provider, payment API, or webhook in version 1

#### Printing for the first pilot

- Support the Epson EcoTank L8050 through its Windows printer driver
- Test print
- Automatic print after fulfillment
- Persistent print queue
- Print status: queued, printing, completed, failed, cancelled
- Retry failed job
- Staff-authorized reprint
- Duplicate-print protection
- Configurable maximum copies
- Paper/media counter and low-media warning
- Log printer settings used for each job so a failed result can be reproduced

### P1 — important after the core pilot works

- Multiple branded templates
- Color, black-and-white, and simple beauty filters
- Background replacement
- Multiple print sizes
- Product bundles
- Promotion codes
- QR Ph, GCash, Maya, and card payments through a Philippine payment provider
- Email or SMS receipt
- Staff accounts and roles
- Remote support connection
- Cloud backup and synchronization
- Owner web dashboard
- Remote product and price updates
- Device heartbeat and alerts
- Sales reporting by booth and location
- Refund initiation from the owner dashboard
- Automatic application updates with rollback
- Multilingual customer interface

### P2 — future opportunities

- iOS or Android booth application
- GIF and boomerang modes
- Video booth
- 360 video
- AI portraits
- Public event galleries
- Customer surveys and marketing consent
- Social sharing
- Multiple businesses or tenants
- Subscription billing for other booth operators
- Template marketplace
- Multi-location inventory management

### Explicit non-goals for version 1

- Supporting every camera and printer
- Shipping Windows, macOS, iOS, and Android together
- Building the remote dashboard before the local booth works reliably
- AI photo generation
- Public social galleries
- Selling WanderBooth to other companies
- Collecting marketing data that is not necessary to fulfill the customer's order

## 8. Application screens

### Customer screens

1. Attract/welcome
2. Product selection
3. Layout selection
4. Design selection
5. Privacy notice
6. Waiting for attendant cash confirmation
7. Get ready/live preview
8. Countdown
9. Capture confirmation
10. Review and retake
11. Processing
12. Print status
13. QR download
14. Thank you/reset

### Attendant screens

1. Status overview
2. Camera test
3. Printer test and queue
4. Latest sessions
5. Reprint and re-display QR
6. Cash approval
7. Error recovery
8. End-of-day summary

### Owner screens

1. Products and prices
2. Layouts and branding
3. Customer-flow settings
4. Sessions and orders
5. Sales summary and CSV export
6. Storage and retention
7. Device and network configuration
8. Diagnostics and logs

## 9. Recommended first-release architecture

This architecture is a proposal, not a final commitment. Hardware decisions may change it.

### WanderBooth Host on Windows

- **Shared interface:** React and TypeScript
- **Desktop shell and hardware host:** Electron
- **Local application service:** Node.js inside the Electron main process
- **Local database:** SQLite
- **Photo processing:** Sharp, with a controlled template renderer
- **QR generation:** a maintained QR-code library
- **Local web and download server:** a small HTTP server bound to the booth's private network
- **Live communication:** WebSocket connection between the Host and iPad
- **Camera adapter:** one replaceable module for each supported camera workflow
- **Print adapter:** Windows print integration configured for the Epson L8050
- **Packaging:** signed Windows installer with automatic update support added after the pilot

The Host can also display owner and diagnostic screens directly on the Windows computer.

### WanderBooth Touch on iPad

- The Host serves the customer interface over the local network.
- The iPad opens the interface in Safari or as an installed Progressive Web App.
- iPad Guided Access keeps the customer inside WanderBooth.
- Customer taps send commands to the Host; the Host remains responsible for camera capture and printing.
- No App Store release is required for the first pilot.

### Why Electron plus a local web client is proposed

- It uses web development skills while producing an installable desktop application.
- It supports Windows automatic startup and access to local hardware.
- It can run the local QR download server.
- It can access local files and SQLite.
- It provides more printing control than a normal browser.
- It lets the iPad act as a dedicated touch controller without trying to install Windows printer or camera drivers on it.
- A large ecosystem makes the initial application easier to maintain than a custom native application.

The trade-off is a larger installation size and higher memory usage. For a dedicated booth laptop or PC, that is acceptable if reliability tests pass.

### Later cloud components

- Web dashboard built with React/Next.js
- API service
- PostgreSQL database
- S3-compatible private media storage
- Expiring signed download links
- Device heartbeat and remote settings synchronization

The cloud design must not become a dependency for local capture, local saving, or offline QR delivery.

Architecture decisions are recorded in [docs/decisions](docs/decisions/).

## 10. Conceptual data model

These are the main records the application must understand.

| Record | Plain-language meaning |
|---|---|
| Product | Something a customer can buy, such as one digital photo or a 4×6 print package |
| Session | One customer's complete booth interaction |
| Capture | An original photo taken during a session |
| Deliverable | The final branded image, strip, print file, or phone-download image |
| Order | The selected product, price, payment state, and fulfillment state |
| Payment | An attendant-confirmed cash payment in version 1; later, a verified electronic payment attempt |
| Print job | A request to send a particular deliverable to a printer |
| Share token | The private random key used in the QR download link |
| Layout | The arrangement and size of one or more photos on a digital image or printed sheet |
| Design | The branded frame, colors, graphics, and text applied to a layout |
| Device | The booth computer and its configuration |
| Audit event | A timestamped record of an important action or change |

## 11. Privacy and security requirements

- Explain before capture why the photo is being collected and how it will be delivered.
- Collect only data needed to complete the session and payment.
- Do not make one customer's photo visible in another customer's gallery.
- Keep download tokens unguessable.
- Store future payment-provider secrets outside the user interface and logs.
- Never store full card information when electronic payments are added.
- Record consent, deletion, reprint, refund, and administrative actions.
- Define separate retention periods for QR access, local recovery, and financial records.
- Provide a way to delete a customer's photo when legally and operationally permitted.
- Obtain separate consent before future marketing or public-gallery use.
- Treat children's photos and AI transformations as later policy decisions requiring additional care.

## 12. Reliability requirements

Before WanderBooth accepts paying customers, it must demonstrate:

- 300 consecutive test sessions without losing a completed photo;
- successful restart and recovery during every major session state;
- no duplicate fulfillment from repeated taps or staff actions;
- at least 99% successful print completion when printing is included;
- a median capture-to-delivery time below 45 seconds;
- a visible, understandable recovery instruction for every expected failure;
- successful QR downloads on current iPhone and Android devices;
- successful operation with internet disconnected; and
- correct automatic deletion after the configured retention period.

## 13. Development roadmap

### Phase 0 — decisions and hardware experiment

**Goal:** remove the riskiest unknowns before building the full interface.

Tasks:

- Confirm the remaining cash-flow details and first products.
- Confirm Windows version and booth hardware.
- Compare Canon EOS 60D and Fujifilm X-M5 tethering, live view, trigger control, and transfer speed.
- Test Epson L8050 print sizes, margins, speed, quality, paper handling, and failure recovery.
- Confirm the iPad model and iPadOS version.
- Select and test a dedicated local router.
- Prototype camera capture.
- Prototype photo processing.
- Prototype the iPad-to-Host control connection.
- Prototype phone download over the offline booth network.

Exit condition: an iPad triggers the Host to capture a photo, the Host creates a private local link, and a phone downloads the branded result by QR without internet.

### Phase 1 — offline photo-session prototype

Tasks:

- Create the Host application and iPad web client.
- Add iPad Guided Access instructions and Host automatic startup.
- Add attract, preview, countdown, capture, review, processing, and QR screens.
- Add session folders and SQLite records.
- Add restart recovery.
- Add a simple local owner area.

Exit condition: a complete unpaid test session works repeatedly with internet disconnected.

### Phase 2 — products and business workflow

Tasks:

- Add products and local pricing.
- Add configurable templates and branding.
- Add session history and CSV export.
- Add retention and cleanup.
- Add staff PIN and audit records.

Exit condition: the business can configure and operate one booth without editing code.

### Phase 3 — payment and printing

This phase implements the confirmed cash and Epson printing workflow. Electronic payments remain deferred.

Tasks:

- Add attendant-confirmed cash approval and change calculation.
- Add fulfillment and refund states.
- Integrate the Epson L8050 through the Windows driver.
- Add print queue, retry, and reprint protection.

Exit condition: one cash-confirmed order reliably produces exactly one purchased digital deliverable and the correct number of prints.

### Phase 4 — hardening and controlled pilot

Tasks:

- Run power-loss, network-loss, camera-loss, and printer-loss tests.
- Complete 300-session reliability test.
- Package a signed installer.
- Prepare operator setup and troubleshooting guides.
- Run a staff-only pilot, then a limited customer pilot.
- Review metrics and incidents after each pilot.

### Phase 5 — dashboard and expansion

- Build the remote web dashboard only after the booth is stable.
- Add remote configuration, cloud storage, support tools, and reporting.
- Evaluate a mobile booth app after real usage clarifies the need.

## 14. Version-control and documentation process

### Repository setup

The public repository is **[github.com/kurge/WanderBooth](https://github.com/kurge/WanderBooth)**. This project folder is initialized as its own nested Git repository so Git does not use the unrelated repository currently rooted at `/Users/kurgegarcia`.

Because the repository is public, it must never contain real customer photos, session databases, cash records, credentials, API keys, local backups, or diagnostic exports. Synthetic fixtures may be committed only when their ownership and redistribution rights are clear.

Suggested repository structure:

```text
wanderbooth/
├── README.md
├── WanderBooth - Changelog.md
├── WanderBooth - Product Plan and Feature Specification.md
├── docs/
│   ├── HARDWARE.md
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md
│   └── decisions/
├── apps/
│   └── desktop/
├── packages/
│   └── shared/
└── tests/
```

### Release versions

Use semantic versioning:

- `0.1.0` — early prototype
- `0.2.0` — new prototype capability
- `0.2.1` — bug fix without a new capability
- `1.0.0` — first production release approved for paying customers

### Change workflow

1. Every task begins with a written goal and acceptance criteria.
2. Work happens on a small branch, using `codex/` for Codex-created branches.
3. Commits describe one logical change.
4. Automated tests run before changes are merged.
5. Material product or architecture decisions receive a short decision record.
6. User-visible changes are added to `CHANGELOG.md`.
7. Releases are tagged in GitHub.
8. No credentials, customer photos, local databases, or production payment data are committed.
9. Changes pushed directly to `main` are limited to initial documentation/bootstrap work; application code uses reviewed branches.

Suggested commit language:

```text
feat: add offline session download page
fix: prevent duplicate print fulfillment
docs: record first-camera decision
test: cover session recovery after restart
```

### Documentation that must exist before production

- Product plan
- Architecture overview
- Hardware setup guide
- Booth-operator guide
- Troubleshooting runbook
- Privacy and retention policy
- Payment/refund procedure
- Release checklist
- Incident log
- Changelog

## 15. Major risks

| Risk | Why it matters | Early response |
|---|---|---|
| Guest phone cannot reach the local booth | Offline QR delivery fails | Test a dedicated router and current iPhone/Android devices before full development |
| Camera disconnects | Cash-confirmed customer cannot take a photo | Detect readiness before cash confirmation and implement reconnect/recovery |
| Camera cannot be controlled from our app | The owned camera may tether only through manufacturer software | Run a time-boxed Canon 60D versus Fujifilm X-M5 integration spike and keep a watched-folder fallback |
| iPad loses its Host connection | Customer interface cannot trigger or observe the session | Dedicated router, visible connection status, automatic reconnect, and safe session recovery |
| Printer fails after cash confirmation | Customer paid but receives nothing | Persistent print queue, staff recovery, reprint protection, refund state |
| Power loss | Session or order may be lost | Persist every state transition in SQLite and save files before moving forward |
| Repeated tap or staff action | Duplicate order or print | Idempotent commands and unique fulfillment constraints |
| Storage fills | New sessions fail or old files remain indefinitely | Capacity warnings, retention cleanup, and backups |
| Supporting too much hardware | Development becomes unpredictable | Certify one camera, printer, computer, and router combination first |
| Privacy mistake | Customer trust and legal exposure | Private tokens, clear notice, minimum collection, and automatic deletion |

## 16. Remaining Phase 0 questions for the owner

The repository and product baseline now exist. These answers are needed before the first implementation backlog is approved.

### Business and customer flow

1. Confirm that the attendant should collect and confirm cash **before** the customer starts the session.
2. How many retakes should a customer receive?
3. What are the first products, print quantities, and approximate PHP prices?
4. Which print sizes should the Epson L8050 produce first: 4×6, 2×6 strips printed on 4×6 paper, or something else?
5. How many layouts and visual designs should customers choose from in the first pilot?
6. Who will supply the first design assets and branding?

### Hardware and network

7. Which exact Windows laptop or PC will run the first booth, including Windows version, processor, and memory?
8. Which iPad model and iPadOS version will be the touchscreen?
9. May we test both owned cameras before choosing, or do you prefer the Canon EOS 60D or Fujifilm X-M5?
10. Is it acceptable for guests to join a WanderBooth Wi-Fi network when the venue has no internet?
11. Are you willing to use a small dedicated travel router at the booth?
12. Must the 30-day QR link work after the customer leaves the booth network? If yes, a minimal cloud delivery service becomes part of P0.

### Pilot and repository

13. Is there a target date or event for the first live pilot?
14. The repository is public but currently has no software license. Should it remain publicly viewable with default copyright, or do you eventually want an open-source license?

## 17. Plain-language glossary

| Term | Meaning |
|---|---|
| Desktop application | A program installed on the computer, like Spotify or Photoshop, rather than a website opened in a browser |
| Host | The Windows part of WanderBooth that controls hardware, storage, processing, and the local network service |
| Web client | The touch interface loaded by the iPad from the WanderBooth Host over the private network |
| Offline first | Core work succeeds locally even when internet is unavailable |
| Local network | A private Wi-Fi connection between the booth computer and nearby customer phones |
| Local server | A small part of WanderBooth that sends a customer's photo to their phone over the booth network |
| SQLite | A small database stored as a file on the booth computer |
| Webhook | A secure message from a payment provider telling WanderBooth that a payment succeeded or failed |
| Idempotency | Protection that makes repeated messages produce only one order, download, or print |
| Kiosk mode | A locked full-screen mode that prevents customers from opening other computer applications |
| Expiring link | A download address that stops working after a defined time |
| Semantic versioning | A consistent numbering system for releases, such as `0.2.1` |
| Acceptance criteria | Specific checks that prove a task works as intended |

## 18. Document change history

| Version | Date | Change |
|---|---|---|
| 0.2.0 | 2026-10-02 | Confirmed digital and print products, cash-only pilot, iPad touchscreen, owned Canon/Fujifilm/Epson hardware, 30-day retention, branded-only delivery, public GitHub repository, and Host-plus-iPad architecture. |
| 0.1.0 | 2026-10-01 | Initial product plan covering offline-first operation, QR photo delivery, first-release features, proposed architecture, roadmap, version control, risks, and blocking questions. |
