# Reusable Template Gallery Test — 2026-10-02

| Field | Result |
|---|---|
| Build | WanderBooth 0.10.0 |
| Runtime | Isolated local Host with synthetic artwork and simulator captures |
| Gallery access | Pass; available from the idle operator screen and rejected for customer commands |
| Artwork import | Pass; transparent 1200×1800 PNG imported for Double strip 4×6 |
| Placeholder editor | Pass; six numbered placeholders shown without taking photos |
| Saved definition | Pass; product, layout, artwork, frame, holder, crop, rotation, and lock values persist together |
| Session selection | Pass; saved template appears before the manual choices and restores six required captures |
| Automatic fill | Pass; simulator Photos 1–6 replace saved Placeholder positions 1–6 |
| Review | Pass; selected saved template remains applied and compatible templates can be reapplied |
| Export | Pass; six branded individuals, 1200×1800 Double strip composite, and looping slideshow generated |
| Save changes / Save as new | Pass in state-machine tests |
| Delete safety | Pass; referenced-artwork request returned HTTP 409 before deletion and both local artwork files remained intact |
| Reset persistence | Pass; saved templates remain after a booth reset |
| Automated checks | Pass; formatting, lint, 35 unit tests, Host type/build, and web type/build |
| Standard smoke session | Pass; six captures and all expected deliverables |
| Installation image | Pass; `WanderBooth-0.10.0-arm64.dmg`, 133 MB, valid disk-image checksum |
| SHA-256 | `60f008a71273283144d61d283beea050f37f39f888b721439360212672173561` |

The browser verification deliberately used generated artwork and simulator captures. No customer photos, owner template files, or private runtime database were added to the public repository. The test skipped careful visual alignment of the synthetic openings; its purpose was to prove that a saved placeholder definition is reusable from preparation through final export. Production artwork still needs to be aligned and approved on the physical Mac/iPad workflow before the live pilot.
