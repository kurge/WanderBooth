# Test Record: Private Cloud QR Delivery

| Field | Value |
|---|---|
| Date | 2026-10-06 |
| Build | WanderBooth 0.14.0 source build |
| Runtime | Disposable Host data directory; simulator media; local Wrangler D1/R2 emulation |
| Real customer data | None |

## Results

| Check | Result |
|---|---|
| Host, web, and Cloudflare Worker production type/build checks | Pass |
| Changed-file Biome checks | Pass |
| Local D1 migration | Pass |
| Authenticated Worker health route | Pass |
| Manifest, image/video upload, completion, gallery, and file download | Pass |
| Full Host-to-Worker synthetic session | Pass; three branded individuals, layout, and slideshow reached `ready` |
| Print-sheet exclusion | Pass; the dedicated print deliverable was not present in the cloud manifest/gallery |
| Persistent delivery state | Pass; token, link, created/expiry dates, attempts, and readiness were stored in event history |
| Operator Cloudflare configuration screen | Pass; URL/token test and status messaging were visually checked |
| Operator completion/history QR | Pass; ready QR, expiry, re-display details, and retry placement were visually checked |
| Customer/iPad QR screen | Pass at a wide iPad-like viewport |
| Guest mobile gallery | Pass; branded images, looping video, and download controls were visually checked |
| Exact expired access | Pass; expired gallery returned HTTP 410 before cleanup |
| Scheduled cleanup | Pass; Worker cron removed file records/media and marked the delivery expired |
| Apple-silicon DMG | Pass; 133 MB image verified by macOS, SHA-256 `af36fa1c362364dce02000c4d4968a96391416221daf71beb02a47b71f2030eb` |
| Restart-safe queue rule | Pass in reducer/migration inspection; interrupted `uploading` state restores as `queued` |
| Automated Vitest suite | Environment blocked; focused Vitest workers hung before assertions and were cancelled after 90 seconds. New cloud/reducer tests exist but are not claimed as executed. |
| Real Cloudflare deployment | Pending account OAuth approval, resource creation, secret setup, and deploy |
| Physical phone over mobile data | Pending real `workers.dev` deployment |

## Notes

All uploads used generated simulator files in disposable directories outside the repository. A synthetic local device token was stored only in ignored `cloud/.dev.vars`. No production secret, real photo, runtime database, or private customer information was committed.

The local end-to-end smoke created a disposable event, completed three captures, generated individual PNGs, the final strip, print sheet, and MP4, then waited for the background queue to reach `ready`. The resulting guest gallery contained the approved customer files and excluded the print-only sheet.

This record separates verified local behavior from the two remaining external checks: deployment to the owner's Cloudflare account and scanning the deployed QR from a physical phone on mobile data.
