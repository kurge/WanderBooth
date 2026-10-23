# Frame color selection and decoration removal

Date: 2026-10-23 · Version: 0.17.1

## User-visible change

The initial selection screen no longer offers built-in decorations. The review screen's Detail menu is also removed. Fixed frame colors, imported custom frames, prepared templates, and per-photo filters remain available.

Midnight Film and Ruby Cream previously used their cream artwork accent as the selection border, making the selected state hard to see against the pale card. All five colors now use a consistent blue selection outline and checkmark. The review swatches also name the selected color.

## Compatibility

- No database migration, event rewrite, template rewrite, or media deletion.
- Selecting a fixed color clears a legacy decoration. New commands selecting retired decorations are rejected by the Host.
- Legacy decoration definitions and rendering remain so old records can still be resolved. Already-generated photos stay unchanged.
- Imported custom artwork and its transform/holder controls are untouched.

## Verification

- `pnpm check`: formatting/lint, 89 tests, and Host/web/cloud production builds passed.
- Added regression coverage for all five colors in both picker sizes, selected-state changes, rejection of retired decorations, and clearing old decoration choices without mutating the original record.
- Used a separate temporary runtime and the synthetic camera; no real event, camera session, customer photo, or cloud configuration was used.
- Visually confirmed Midnight Film and Ruby Cream highlights in selection and review, and absence of the decoration controls. The imported-frame choice and per-photo filters remained present.
- Completed three simulated captures, selected Warm on Photo 1, changed the frame colors during review, and approved the session. The completion screen exposed the three branded photos, final strip, slideshow, and print-preview control. No physical print or cloud upload was performed.

## Packaged build

- Unsigned Apple-silicon `WanderBooth-0.17.1-arm64.dmg`, approximately 148 MiB.
- Built the app with Electron Builder and used the documented plain-DMG method. Existing installers were retained.
- `hdiutil verify` passed. The packaged runtime reported version 0.17.1 and generated a JPEG using its bundled Sharp dependency.
- SHA-256: `433c4786dc7e731e67437593e19f66a0d4009c9f0eea547fad0a1c33432be82a`.

Screenshots and synthetic session media remain outside version control. This release does not change camera integration or establish additional physical-camera reliability results.
