# Template photo orientation and local originals

From version 0.18.0, photo shape belongs to each template holder, rather than one global landscape setting. A vertical strip can contain portrait photos, landscape photos, or a mixture. Paper size and photo orientation are separate.

## Prepare a template once

1. Open **Template Library**, or **Manage event templates** for an event-only change.
2. Create or edit a template with your transparent frame.
3. In **Photo orientation**, choose a shape for each holder:
   - **Landscape · 4:3** — wider than tall.
   - **Portrait · 3:4** — taller than wide.
   - **Custom · free sizing** — retain the current shape and adjust its edges manually.
4. Position holders over the frame openings, then save. These choices return when the template is reopened or selected for a session.

Changing a preset preserves the holder's center and approximately its area, within the editor's size limits. It does not rotate the photo or frame artwork. Corner handles resize proportionally; middle-edge handles reshape the opening without stretching the image, changing its orientation label to Custom. Locked holders must be unlocked before changing orientation.

These are staff-only controls. Event-template changes remain in that event; they do not alter the master or other events. Staff can also select a holder during final review and change its orientation for that session only.

## Live view and capture

- The next capture's holder determines the preview shape, including retakes. Waiting cards follow that shape; captured cards use the actual saved image dimensions.
- A single shape uses a centered crop, never stretching. A 1920×1080 source becomes 1440×1080 for landscape 4:3, or 810×1080 for portrait 3:4.
- If one capture is repeated in holders with different shapes, preview shows the full camera image with centered crop guides for each shape. That capture retains the full incoming scene, and each holder crops it independently.
- Custom holders use their actual saved width/height ratio, not a forced 4:3 or 3:4 approximation.
- Live view is mirrored for posing; saved photos are not mirrored.
- A portrait software crop does not require rotating the physical camera, but it uses fewer horizontal source pixels. It cannot create detail the camera did not supply.

The preview relay preserves the full source, and each screen applies the shared framing rules. Physical cameras may provide different fields of view in live view and still-photo modes. X-M5 Hybrid also uses separate preview and still inputs. Matching shape does not guarantee pixel-identical edges. Guides show centered capture crops, not every possible final crop adjustment, rotation or artwork obstruction: check a test photo and the final composed preview before service.

## Review, downloads and printing

The final layout preview, layout export and print sheet use the uncropped local original when available, applying the photo's filter and each holder's own position, crop and rotation. Changing a portrait holder to landscape after capture can therefore recover scene area outside the initial portrait crop. Older captures without an original reference fall back to their existing source file.

Individual branded downloads retain the captured shape, with a 1200-pixel long edge and branding over the bottom. For example, portrait is 900×1200; landscape 4:3 is 1200×900. A full 16:9 mixed-holder capture becomes 1200×675. Changing one holder during final review changes the layout, not that separate individual download's capture-time crop.

The slideshow remains a 1200×900 video, fitting each branded photo without stretching; portrait or wider photos can have letterboxing. Print paper sizes, template canvas sizes and duplication rules are unchanged.

## Where originals are kept

Each new session contains:

```text
events/<event-id>/sessions/<session-id>/
  originals/    untouched incoming camera files, including earlier retakes
  captures/     unmirrored template-framed copies (full scene for mixed shapes)
  deliverables/ branded photos, layout, print sheet and slideshow
```

For the installed Mac app, these folders are inside:
`~/Library/Application Support/WanderBooth/runtime/`

In Finder, choose **Go → Go to Folder**, paste that location, and open `events`. Folder IDs identify the event/session internally; filenames include the photo and take numbers (`r1`, `r2`, etc.). If the app's folder name differs, find the WanderBooth application-data folder under Application Support.

For development, the default root is `data/runtime/`; an explicit `WANDERBOOTH_DATA_DIR` takes precedence.

The original is the exact JPEG received from a tethered camera, or the full, unmirrored JPEG frame sent by the webcam. A webcam backup cannot restore pixels its driver never supplied. RAW files are not imported into this local backup; USB controllers continue retaining camera-side JPEG/RAW copies.

Originals and earlier takes remain until the event is deliberately deleted. They use additional disk space. They are **not uploaded** to the cloud gallery and have no guest download button. QR expiry is still 30 days and does not delete local backups. The local Host still uses the prototype's screen-based roles, so this is not a separate authenticated backup vault.

Replacing the application does not relocate runtime data. Existing session files and template geometry are not recropped or migrated. Legacy holder shapes are inferred from their dimensions, so non-preset shapes show Custom. New capture framing follows those saved dimensions. Already-generated customer outputs stay unchanged.

## Implementation and checks

- `src/shared/templateFraming.ts`: per-holder orientation, stable-ID normalization, capture-specific framing, mixed-aspect guides and original-source fallback.
- `src/shared/photoFraming.ts`: shared arbitrary-aspect center-crop geometry.
- `src/host/photoFraming.ts`: EXIF orientation, JPEG generation, full-source mirrored relay and exclusive-write original/capture storage.
- Optional holder orientation, capture pixel dimensions and original URL persist in existing state records without a database schema migration.
- Webcam, Canon, X-M5 folder/hybrid and simulator session paths use the same saving helper.
- The QR upload allowlist still includes only branded guest deliverables, never either source folder or intermediate filtered originals.

Before the next event: select a portrait template, a landscape template and a repeated mixed-shape template, then compare live view, a capture and the final print preview using the actual camera and customer screen. See the [0.18.0 test record](test-records/2026-10-23-template-orientation.md) for software checks and remaining hardware checks.
