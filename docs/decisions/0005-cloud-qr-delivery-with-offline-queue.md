# ADR 0005: Cloud QR Delivery with Offline Queue

- Status: Accepted
- Date: 2026-10-02

## Decision

The first WanderBooth pilot will provide a private cloud QR link that works away from the booth and expires after 30 days. Guests use mobile data or any internet connection and do not join WanderBooth Wi-Fi.

For a three-photo strip session, the page will offer the final branded strip, three separately downloadable branded photos, and a short looping H.264 MP4 slideshow that shows each photo for approximately 1.5 seconds.

The Host will save all deliverables locally before upload. A persistent queue will retry interrupted uploads. Capture, processing, local saving, and printing remain available during an internet outage; only cloud delivery is delayed.

## Why

- Customers need the QR link to work for 30 days after leaving the booth.
- Requiring a guest to change Wi-Fi networks is unnecessary friction.
- A minimal delivery service is smaller and safer than building the full business dashboard before the booth works.
- Durable local files and an upload queue preserve the offline-first promise without pretending a remote link can work without internet.

## Trade-offs

- The first pilot now needs a small cloud API, private object storage, a tokenized download page, monitoring, and automatic deletion.
- Immediate QR availability depends on the Host having a usable internet/data connection.
- The operator needs a clear pending-delivery recovery process.
- Cloud media handling adds security, privacy, cost, and retention responsibilities.
