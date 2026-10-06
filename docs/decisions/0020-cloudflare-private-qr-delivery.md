# ADR 0020: Cloudflare Private QR Delivery

- Status: Accepted
- Date: 2026-10-06

## Decision

Implement the Phase 0 customer QR service as one Cloudflare Worker with D1 delivery metadata, a private R2 media bucket, and an hourly Cron Trigger. The desktop Host authenticates with one booth credential, creates a stable 192-bit random token per completed session, and persistently retries an idempotent manifest/file/complete upload sequence.

The guest link uses the Worker `workers.dev` hostname until WanderBooth owns a domain. The QR appears on the operator/customer screens and in event history; it is not printed into the photo design in this version.

The cloud gallery contains only branded individual photos, the final layout, and the slideshow. Raw captures, event/client metadata, and the dedicated print sheet remain local.

## Why

- It fulfills the required away-from-booth 30-day link without delaying the full app for a business dashboard.
- Workers, D1, R2, and Cron Triggers keep the pilot service small and in one provider the owner already understands.
- A private bucket plus Worker-controlled reads enforces expiry instead of depending on an unlisted public URL.
- A stable local token and persistent queue preserve the offline-first workflow and let the same QR become ready after connectivity returns.
- Local QR generation avoids a paid or privacy-sensitive QR image API.

## Consequences

- The booth requires a deployed Worker URL and secret before cloud delivery can become ready.
- The Phase 0 token is stored in an owner-only local configuration file; OS-keychain storage and credential rotation are later hardening work.
- Access is blocked exactly at 30 days and hourly cleanup removes media afterward. A 31-day R2 lifecycle rule may be added only as a safety backstop.
- The Worker retains a minimal expired row for a clear expired page and cleanup audit, but removes the media rows and objects.
- Cloud delivery can fail independently without stopping capture, processing, printing, or local event history.
- A future custom domain can replace `workers.dev`; already-issued links must continue to use the base URL saved with their session.

## Alternatives considered

- **Guest joins booth Wi-Fi:** rejected because the link must work after the guest leaves.
- **Public R2 bucket:** rejected because object URLs would bypass expiry checks.
- **Build the full dashboard first:** rejected because it adds unrelated pricing, sales, and account scope before the booth pilot.
- **External QR generator:** rejected because QR pixels can be produced locally and should not disclose private links to another provider.
- **Automatic local 30-day deletion:** rejected; local event retention remains a deliberate staff action and is separate from customer cloud expiry.
