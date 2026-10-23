# Four-photo double strip — 2026-10-23

Version: 0.18.2. Tests used synthetic media in an isolated temporary runtime on port 4195. Real events, owner artwork, cameras and production cloud settings were untouched.

## Intended behavior

- Select **Photo strip → Four-photo double strip** in a session or template setup.
- Eight unique captures fill eight holders: Photos 1–4 run down the left column and Photos 5–8 down the right.
- The full sheet is 4×6 inches / 1200×1800 pixels at 300 DPI. After the center cut, each strip is still 2×6 inches, with four photos rather than three.
- Default holders are landscape 4:3. Imported artwork is a transparent whole-sheet 1200×1800 PNG, or the same aspect ratio at another resolution. Saved templates retain orientation, placement and normal editing controls.
- Single-strip options and the six-shot double strip remain available without migration.

## Verification

- All 141 tests in 18 files passed; formatting/lint and Host/web/cloud builds passed.
- New tests check holder bounds/order, eight distinct capture indices, both operation modes, automatic capture progression, retake 8, template save/reopen and portrait orientation on holder 8.
- Artwork tests accept the whole-sheet 4×6 canvas and reject single-strip 600×1800 and physical 2×8 (600×2400) artwork.
- Renderer tests use eight different synthetic colors and sample every holder in the composite and print file. Both outputs are 1200×1800 at 300 DPI, with no repeated capture in the second column.
- Built-in browser controls verified the new menu entry, Ruby Cream frame selection, cash confirmation, eight automatic simulator captures, final review, retake 8, B&W on photo 8, approval and print preview. No native print dialog was submitted.
- The real Host created eight branded individual PNGs, the full composite, print file and a 12-second MP4 (eight photos at 1.5 seconds each).
- Read-only inspection of the isolated SQLite database confirmed completed event history, retained originals, the final-shot revision/filter and a persisted QR record with exactly 30 days between creation and expiry. It correctly remains “Cloud setup required”; no production upload was attempted.
- The generated print sheet matches the full composite pixel-for-pixel. The visual preview shows Photos 1–4 left, 5–8 right, with a center cut guide.
- The browser-testing skill CLI was unavailable, so built-in browser controls were used. Screenshot evidence stays in the temporary QA folder, outside Git.

## Installer

- Unsigned Apple-silicon app built with electron-builder; plain DMG created using the established fallback.
- The packaged runtime reported version 0.18.2 and the correct eight-shot layout. Bundled Sharp generated a PNG successfully.
- `hdiutil verify` passed.
- File: `release/WanderBooth-0.18.2-arm64.dmg` (155,057,238 bytes).
- SHA-256: `8c59cebf10dd2439055577fdc14a0a06b666ca7fe0a9b680312c8e529e54f682`.
- Older installers were retained; the installed application was not replaced automatically.

## Remaining physical check

Print one sample on the Epson with 4×6 portrait paper and Actual Size / 100%. Check edge cropping and cut down the center. No physical camera, iPad, Epson or production-cloud test was performed for this release.
