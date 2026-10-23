# Template photo orientation — 2026-10-23

Version: 0.18.0. Only generated media and a separate temporary Host runtime on port 4193 were used. No real event, supplied template file, physical camera connection or production cloud configuration was changed.

## Automated checks

- All 126 tests passed; formatting/lint and Host/web/cloud builds passed.
- Per-holder orientation preserves center, rotation and area where possible; presets use exact 4:3 or 3:4 ratios.
- Commands require staff, an editable phase, a real holder and an unlocked object. Invalid orientation values are rejected.
- Save/reopen, repeated capture mapping, legacy geometry, stable holder IDs and orientation normalization are covered.
- Free aspect changes switch to Custom; rotation retains the preset. Retake framing uses the correct capture slot.
- UI tests cover selector commands, locking, portrait/landscape switching, mixed-aspect guides and waiting/captured card ratios.
- Image tests cover arbitrary/portrait/full-source framing, mirrored full preview, exact local originals and portrait branded output.

## Browser and Host integration

1. Imported a generated transparent outline into a new custom portrait 4×6 template.
2. Created three holders mapped to Capture 1, Capture 2, Capture 1; chose Portrait, Portrait and Landscape through the UI.
3. Saved the template, restarted the isolated Host, and verified the same orientations and holder IDs were restored.
4. Copied the template into a new test event. A synthetic 1920×1080 camera source exercised the normal preview/capture endpoints without enabling a real camera.
5. Verified full 16:9 live preview with portrait and landscape guides for Capture 1, portrait live view for Capture 2, and a portrait retake.
6. Verified all three composed preview holders referenced uncropped originals. Changed Capture 2's holder to Landscape during final review, then approved.
7. Capture 1 remained 1920×1080; Capture 2 was 810×1080. Both original files exactly matched the submitted source bytes. Individual downloads were 1200×675 and 900×1200, respectively.
8. Layout, 4×6 print sheet, slideshow and event history were generated. A pixel in the final landscape holder contained the yellow outer-source area excluded by its portrait capture (RGB 221, 244, 39), proving export used the original source.
9. Reopened and edited the event template; its orientation change did not affect the reusable library master.

Screenshots were inspected for editor spacing, mixed crop guides and portrait live view. The browser-testing skill's CLI was unavailable, so built-in browser controls were used. The temporary test tab and Host were closed afterward; evidence remains outside Git.

## Installer

- Built the unsigned Apple-silicon app with electron-builder.
- Created a plain DMG using the established fallback; older installers were retained.
- `hdiutil verify` passed. Packaged version is 0.18.0; bundled Sharp converted a synthetic 1920×1080 source to 810×1080 at portrait 3:4.
- File: `release/WanderBooth-0.18.0-arm64.dmg` (155,059,756 bytes).
- SHA-256: `0c42885711265794ec66970e125fe51211ac962c8e485df52faa8049a41d8b11`.
- The app was not automatically installed over the owner's current copy.

## Remaining checks

- Test the actual Canon, webcam fallback and iPad with portrait, landscape and mixed repeated-capture templates. Live-view and still modes may have different fields of view despite matching aspect ratios.
- Print a sample after final alignment. No physical Epson test was performed for this release.
- Very customized rotations, image pans and artwork openings still need visual alignment; centered crop guides are not a pixel-perfect simulation of every final design.
- No production QR upload or deployment was performed. Local originals and intermediate filtered originals remain outside the upload allowlist.
- This Mac build remains unsigned and intended for pilot use.
