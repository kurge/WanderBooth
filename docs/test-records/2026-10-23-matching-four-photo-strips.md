# Four photos, two matching strips — 2026-10-23

Version: 0.18.3. This corrects the misunderstood eight-shot implementation in 0.18.2.

## Expected result

Take four photos once. Place Photos 1–4 on one 2×6 strip. Print that exact finished strip twice, side by side, on a 4×6 sheet.

- Menu: **Photo strip → Four-photo strip 2×6**.
- Capture count: four, not eight.
- Imported artwork and digital strip: 600×1800 pixels.
- Print sheet: 1200×1800 pixels at 300 DPI, containing two identical copies.
- Editing, orientation, filters and artwork apply to the single strip before duplication.
- The mistaken eight-shot menu choice is hidden; its old geometry and ID remain available for saved work. No existing event files or templates are migrated.

## Checks

- All 148 tests in 20 files passed. Formatting/lint and Host/web/cloud production builds passed.
- New shared tests check the menu filter, four holders, four automatic captures in both operating modes, retake 4 and saved-template orientation.
- New renderer tests verify four individual downloads, a 600×1800 digital strip, and a 1200×1800 print file at 300 DPI. Both print halves match the finished strip pixel-for-pixel for fixed-color and imported custom frames.
- Artwork tests accept transparent 600×1800 strip artwork and reject whole-sheet 1200×1800 artwork for this single-strip layout.
- Isolated browser QA used the simulator on port 4196: selected the corrected option, confirmed the eight-shot option was absent, captured four photos, applied B&W to photo 4, approved and opened print preview.
- The real Host produced four branded PNGs, one digital strip, two matching print copies and a six-second MP4. Read-only SQLite checks confirmed event history and a local QR record in the expected unconfigured-cloud state.
- Browser screenshot and pixel checks showed Photos 1, 2, 3 and 4 in the same order on both copies, including the same B&W filter on photo 4.
- Browser-testing CLI unavailable; built-in browser controls were used. Synthetic QA data and screenshots remain outside Git. No physical print dialog was submitted.

## Mac installer

- Packaged version 0.18.3, four-shot catalog entry and hidden legacy menu entry verified inside the actual app bundle. Bundled Sharp generated a PNG successfully.
- Unsigned Apple-silicon installer created using the established plain-DMG fallback.
- `hdiutil verify` passed.
- File: `release/WanderBooth-0.18.3-arm64.dmg` (155,058,000 bytes).
- SHA-256: `f48e3a4ab71ede15dc35bdc58dc3cebd038d18cbe676bd1d796aa1efc88f999d`.
- The installed app, older installers, real events, owner artwork and cloud credentials were untouched.

## Not tested

No physical camera, iPad, Epson or production-cloud test was performed. Print one sample on 4×6 portrait paper at Actual Size / 100% before event use.
