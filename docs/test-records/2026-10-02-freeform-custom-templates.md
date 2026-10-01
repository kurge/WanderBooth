# Freeform custom-template verification — 2026-10-02

## Scope

Verified the staff workflow for portrait/landscape custom templates, holder creation, repeated Capture labels, automatic capture-count derivation, gallery persistence, and session reuse.

All visual testing used synthetic artwork and a separate temporary runtime. No owner template artwork or customer media was added to the repository.

## Results

| Check | Result |
|---|---|
| Automated workflow tests | Pass; 37 tests across three files |
| Production type check and build | Pass |
| Portrait custom canvas | Pass; 1200×1800 preview displayed correctly |
| Add/remove holder controls | Pass; responsive holder list and canvas updated together |
| Repeated capture mapping | Pass; four holders mapped as `1, 1, 2, 3` |
| Derived photo count | Pass; the template and operator sidebar reported three automatic captures |
| Independent holder identity | Pass in state tests; two Capture 1 holders retained separate transforms |
| Eight-holder limit | Pass in state tests and enforced by the Host |
| Saved gallery thumbnail | Pass; labels appeared as `1, 1, 2, 3` |
| Fresh session selection | Pass; saved template appeared as a three-photo custom portrait choice |
| Simulator session | Pass; three shots filled four holders as `1, 1, 2, 3` |
| Full-resolution export | Pass; 1200×1800 PNG repeated Capture 1 and rendered Captures 2–3 once each |
| Deliverable set | Pass; three branded individuals, custom composite, and looping slideshow |
| Installation image | Pass; `WanderBooth-0.11.1-arm64.dmg`, 133 MB, valid disk-image checksum; SHA-256 `29044f3c5ffeabf53b4c07d8d5967393654a76c05033aada201029a1c40c5c92` |
| Template Gallery hierarchy | Pass; custom product occupies its own row and orientation choices sit in a labeled, separated step |
| Responsive spacing | Pass; verified at the normal operator width and below the 820 px single-column breakpoint |

## Notes

The blank portrait/landscape base layouts are implementation details for artwork dimensions. They are hidden from manual session construction after a saved custom template is selected. Production approval still requires the owner to import and align the real event artwork on the physical Mac/iPad setup and inspect an actual 4×6 print.
