# Brand logo update — 2026-10-23

Version: 0.18.4.

## Scope

Use the owner's supplied `assets/brand/source/Photobooth.png` for the app header/loading logo, customer welcome logo, browser favicon and Mac application icon. Keep the app named WanderBooth.

The 2000×2000 source PNG remains unchanged. CSS preserves its proportions and displays it upright. Existing brand colors, generated photo-footer text, saved custom artwork, completed photos and event data are not changed. Older logo assets are retained.

## Checks

- All 148 tests in 20 files passed; formatting/lint and Host/web/cloud builds passed.
- An isolated test Host on port 4197 used a fresh temporary runtime. No real event or camera was opened.
- Built-in browser controls verified the operator header and customer welcome screen. The new logo loaded without distortion. Screenshots remain in the temporary QA directory, outside Git.
- The browser-testing CLI was unavailable, so the built-in browser was used.
- Vite emits a local relative favicon path that also works in the packaged app. Header, welcome and favicon use the same bundled PNG.
- The actual packaged app reported version 0.18.4. Its bundled logo bytes have the same SHA-256 as the supplied source: `2d182b2c9e415adbc5a792b9934e68899b82f633a46a7abbdeeef28a24bca30b`.
- The packaged `icon.icns` was rendered to a temporary PNG for visual inspection and shows the new blue Wander Press Studio artwork.

## Installer

- Unsigned Apple-silicon app packaged with electron-builder; plain DMG created using the established fallback.
- `hdiutil verify` passed.
- File: `release/WanderBooth-0.18.4-arm64.dmg` (170,696,162 bytes).
- SHA-256: `0b69a6883fbe3e9558cdbf19a49cc35182bdfcd75ad05c05e7f3932e66b52eb5`.
- No automatic installation or replacement of the existing app. Older installers retained.
- Physical camera, iPad, printer and production cloud were not exercised; this release changes app branding only.
