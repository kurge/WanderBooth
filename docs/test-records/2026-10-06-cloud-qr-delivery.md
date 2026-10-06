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
| Real Cloudflare deployment | Pass; Worker, APAC D1, private R2, secret, hourly Cron Trigger, and stable workers.dev route are live |
| Production Host-to-Worker session | Pass; six synthetic individuals, one 4×6 layout, and one MP4 reached `ready` with eight successful downloads |
| Production print-sheet exclusion | Pass; D1 contained only six `individual`, one `strip`, and one `slideshow` row |
| Invalid production credential | Pass; authenticated health route returned HTTP 401 |
| R2 lifecycle backstop | Pass; enabled for all objects at 31 days; incomplete multipart uploads abort after 7 days |
| Preview URL hardening | Pass; deployment previews disabled while the stable workers.dev route remains enabled |
| Production credential cleanup | Pass; recovery copy verified in macOS Keychain and temporary plaintext token/runtime removed |
| Existing-session production upload | Pass; four authorized sessions uploaded on their first attempt with 22 individual photos, four final layouts, and four slideshows |
| Existing-session privacy boundary | Pass; two print sheets stayed local, no raw captures were uploaded, and no customer links or media details were added to Git |
| Restart persistence | Pass; production connection and four `ready` states survived a Host restart with zero errors |
| Physical phone over mobile data | Pending; scan the deployed synthetic gallery with Wi-Fi disabled |

## Notes

All uploads used generated simulator files in disposable directories outside the repository. A synthetic local device token was stored only in ignored `cloud/.dev.vars`. No production secret, real photo, runtime database, or private customer information was committed.

The local end-to-end smoke created a disposable event, completed three captures, generated individual PNGs, the final strip, print sheet, and MP4, then waited for the background queue to reach `ready`. The resulting guest gallery contained the approved customer files and excluded the print-only sheet.

The deployed synthetic gallery is available at `https://wanderbooth-delivery.garcia-kathleenrose.workers.dev/d/zfxQC17G1JCfvoaX3n9tlya81XyDB373` until November 5, 2026. It contains no customer data. The remaining external check is scanning that gallery from a physical phone with Wi-Fi disabled so the request uses mobile data.

The installed app was then connected using the token recovery copy from macOS Keychain. Its four authorized existing sessions moved from `not_configured` to `ready` without retries. Public checks returned HTTP 200 with the expected 8, 8, 8, and 6 download links. D1 confirmed the same approved file counts. Real gallery URLs and tokens are deliberately omitted from this record.
