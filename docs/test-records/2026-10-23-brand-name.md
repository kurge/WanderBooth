# Brand name update — 2026-10-23

Version: 0.18.5.

## Scope

Display **WanderBooth by Wander Press Studio** in the shared app header, Electron/browser titles, layout previews and newly generated photo footers. Publish the same attribution in the online QR page after the owner's explicit approval.

The installed application name remains WanderBooth; application ID `ph.wanderpress.wanderbooth` and runtime paths are unchanged. The blue logo source, existing completed media, imported frame artwork and saved events are untouched. No production session was regenerated or uploaded.

## Checks

- All 149 tests in 20 files passed; formatting/lint and Host/web/cloud builds passed.
- Added cloud-rendering regression assertions for the new title/header/footer, retained 30-day wording and unchanged download-link structure.
- Used an isolated Host on port 4198 with a fresh temporary runtime and the simulator. A four-photo 2×6 session produced four branded individuals, a single strip, two matching copies on a 4×6 print sheet, and a slideshow.
- Visually checked the operator header, individual PNG and four-photo strip. The longer attribution fits without clipping.
- The browser-testing CLI was unavailable, so built-in browser controls were used. Screenshots remain in the temporary QA directory outside Git.
- The packaged app reports 0.18.5, the new studio author/title/footer, and the unchanged bundle identifier and application name.

## Online QR service

- Published only the branding/page-layout changes to the existing `wanderbooth-delivery` Worker, with owner approval.
- The production home page visibly shows the new header and footer.
- Read-only production checks passed: public health returns 200, unauthenticated device health still returns 401, and an invalid gallery returns a branded 404 page. No customer token was used.
- Existing domain: `wanderbooth-delivery.wanderpressph.workers.dev`.
- Deployment version: `16a04f55-1d8d-4c05-ab19-11611dc4b7d3`.
- D1/R2 bindings, secrets, schema, QR tokens, uploaded media, hourly cleanup and expiry behavior were not changed. No customer gallery was opened for this verification.

## Installer

- Unsigned Apple-silicon app packaged with electron-builder; plain DMG created using the established fallback.
- `hdiutil verify` passed.
- File: `release/WanderBooth-0.18.5-arm64.dmg` (170,697,254 bytes).
- SHA-256: `8b86e03b7711cdcd0972389b14b4f14c0007b096b9bedf4f631d3150e4b1e527`.
- No automatic installation or replacement of the existing app; older installers retained.
- Physical camera, iPad and printer were not exercised. Real-session mobile downloads were not retested because no delivery logic changed.
