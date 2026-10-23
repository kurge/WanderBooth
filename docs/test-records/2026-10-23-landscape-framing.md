# Landscape 4:3 framing — 2026-10-23

Version: 0.17.2. Only synthetic media and a separate temporary Host runtime were used. No production events, cloud configuration or physical camera connection were changed.

## Automated checks

- All 108 tests passed; formatting/lint and Host/web/cloud builds passed.
- Geometry: 4:3, 16:9, 3:2, portrait, square, odd and invalid dimensions.
- Sharp: crop without stretching or downscaling stills, EXIF orientation before cropping, reduced mirrored preview, unmirrored saved capture.
- Original files are byte-identical to incoming files. Retakes and repeated attempts do not overwrite earlier originals. Corrupt input creates no capture/backup files.
- Webcam canvas sends the full unmirrored frame; preview uses the same center crop as the Host.
- Branded individual output is 1200×900 with the scene's top/bottom framing preserved behind an overlaid branding band.
- Cloud upload regression excludes raw captures and new originals, alongside the print-only sheet.

## Browser check

- Isolated event: three automatic simulator photos and a retake.
- Live area and waiting/captured cards visually use landscape 4:3. Source review images were 1200×900 and displayed approximately 186×139 CSS pixels.
- Review shows “4:3 photos · originals kept locally”; filters and composed-layout preview remain available.
- Four original files and four cropped files remain after the retake; the approved set uses the newest take.
- A Warm filter, branded output, 2×6 layout, duplicated 4×6 print sheet, slideshow and saved event history completed.
- The browser-testing skill's CLI was unavailable; built-in browser automation was used instead.

## Synthetic webcam upload integration

The actual Host HTTP capture endpoint accepted three generated 1920×1080 JPEGs from a WebSocket-driven test session. Each became a 1440×1080 capture, while each local original matched the incoming bytes exactly. Approval produced three 1200×900 branded individual files, a layout, print sheet and slideshow. Event history retained all three original references.

## Installer

- Built the Apple-silicon app with electron-builder; unsigned, as expected.
- Created a plain DMG using the established fallback; the previous installer was retained.
- `hdiutil verify` passed. Packaged version is 0.17.2; bundled Sharp successfully cropped a synthetic 1920×1080 image to 1440×1080.
- File: `release/WanderBooth-0.17.2-arm64.dmg` (148 MiB).
- SHA-256: `0b8d439816b04e35001d93751ce81a0ebb30d8869d0bd0d90ef92b3b230415a8`.

## Remaining checks

- The owner reported Canon capture working on the previous build. No new physical camera or Epson test was performed for this release.
- Check Canon live/still edge alignment and webcam capture on the installed app. A camera's preview and still modes may have different fields of view even with equal aspect ratios.
- No production upload or deployment was performed; QR originals exclusion was tested locally.
- This Mac build is unsigned and intended for pilot use.
