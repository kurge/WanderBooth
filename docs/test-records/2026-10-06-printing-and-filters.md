# Test Record: Manual Printing and Local Filters

| Field | Value |
|---|---|
| Date | 2026-10-06 |
| Build | WanderBooth 0.13.0 source build |
| Runtime | Disposable local data directory; simulator camera |
| Real customer data | None |

## Results

| Check | Result |
|---|---|
| Production Host and web build | Pass |
| JavaScript syntax check for Electron main/preload | Pass |
| Three-capture 2×6 browser flow | Pass |
| Per-photo B&W selection | Pass; only Photo 1 changed in source and layout previews |
| Sharp final filter render | Pass; final Photo 1 and both copies on the 4×6 sheet were monochrome |
| Single-strip print rule | Pass; one finished 2×6 strip was duplicated on the left/right halves of a 1200×1800 4×6 PNG |
| Print preview | Pass; exact sheet, Epson instructions, native-dialog button, and empty history were visible |
| Completed-session history | Pass; captures, normal deliverables, print deliverable, and Preview & print action were visible |
| Six-shot smoke session | Pass; six individual PNGs, 4×6 composite, explicit print sheet, and MP4 slideshow were generated |
| Targeted reducer checks | Pass; per-photo filter selection preserved the source URL and print history persisted on the completed event session |
| Automated Vitest suite | Environment blocked; all workers timed out before loading any test file, so no assertion ran. Two new reducer tests were added for filters and print-history replacement and remain to be rerun. |
| Physical Epson L8050 output | Pass; the owner successfully printed photos through the implemented workflow on 2026-10-06 |
| Electron native-dialog callback | Pass for the first owner-run Epson workflow; cancellation and repeatability across final paper/driver presets still need deliberate regression tests |
| Apple-silicon DMG | Blocked; two clean Electron Builder starts stalled before producing output, so no 0.13.0 DMG is claimed |

## Notes

The UI test used generated simulator photos in a temporary directory outside the repository. The print preview visibly showed two matching 2×6 strips on one portrait 4×6 page, with Photo 1's B&W filter repeated correctly. The browser fallback was not allowed to submit a physical job.

The standard `pnpm test` command was attempted in the sandbox and outside it. Vitest reported a 60-second worker-start timeout for all three existing test files before any tests executed. Production builds and the end-to-end smoke workflow both completed successfully; this record does not misrepresent the automated suite as passing.

After the initial test record was written, the owner ran the packaged printing workflow with the Epson L8050 and confirmed that photos printed successfully. This validates the manual preview-to-system-dialog path. It does not yet certify one exact borderless, scaling, paper, color-management, and quality preset for every event machine.
