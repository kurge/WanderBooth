# Landscape 4:3 photos and local originals

From version 0.17.2, new session photos and live view use **landscape 4:3**: wider than tall. This is a shape, not a fixed camera resolution.

## What you will see

- A 4:3 live view, matching captured-photo cards and waiting cards.
- Wider images are cropped equally from both sides, without stretching. For example, a 1920×1080 video frame becomes a 1440×1080 session photo. A 5184×3456 still becomes 4608×3456.
- If an input is square or portrait, the crop removes top and bottom instead. Tiny rounding differences of up to a few pixels are necessary for odd image sizes.
- Live view is mirrored for posing; saved photos are not mirrored.
- The individual branded download is 1200×900. Its branding band overlays the bottom 100 pixels instead of cropping the scene again and appending a footer.
- Print sizes, custom template canvases and existing photo-holder positions have not changed. Holders can still apply their own crop to fit the chosen design.

The same crop calculation is used for webcam preview and session capture, and for Canon USB preview. Physical cameras may provide different fields of view in live view and still-photo modes. X-M5 Hybrid also uses separate preview and still inputs. Matching their 4:3 shape does not guarantee pixel-identical framing: check a test photo before service.

## Where the originals are kept

Each session now contains:

```text
events/<event-id>/sessions/<session-id>/
  originals/    untouched incoming camera files, including earlier retakes
  captures/     unmirrored 4:3 copies used by the app
  deliverables/ branded photos, layout, print sheet and slideshow
```

For the installed Mac app, these folders are inside:
`~/Library/Application Support/WanderBooth/runtime/`

In Finder, choose **Go → Go to Folder**, paste that location, and open `events`. Folder IDs identify the event/session internally; capture filenames include the photo number and take number (`r1`, `r2`, etc.). If the app's folder name differs, find the WanderBooth application-data folder under Application Support.

For development, the default root is `data/runtime/`; an explicit `WANDERBOOTH_DATA_DIR` takes precedence.

The original is the exact JPEG received from a tethered camera, or the full, unmirrored JPEG frame sent by the webcam. A webcam backup cannot restore pixels its driver never supplied. RAW files are not imported into this local backup; USB controllers continue retaining camera-side JPEG/RAW copies.

Originals and earlier takes remain until the event is deliberately deleted. They use additional disk space. They are **not uploaded** to the cloud gallery and have no guest download button. QR expiry is still 30 days and does not delete local backups. The local Host still uses the prototype's screen-based roles, so this is not a separate authenticated backup vault.

Replacing the application does not relocate the runtime data. Existing sessions and files are not recropped or migrated. Older captures have no new backup reference; their existing source files remain as before. There is no in-app restore/reframe-from-original tool yet.

## Implementation and checks

- `src/shared/photoFraming.ts`: shared center-crop geometry.
- `src/host/photoFraming.ts`: EXIF orientation, 4:3 JPEG generation, reduced mirrored preview and exclusive-write original/capture storage.
- `Capture.originalMediaUrl`: optional local backup reference; compatible with existing records without a database migration.
- Webcam, Canon, X-M5 folder/hybrid and simulator session paths all use the same saving helper.
- Filtering and delivery continue using the cropped capture. The QR upload allowlist includes only branded guest deliverables, never either source folder.

Sharp's [auto-orientation](https://sharp.pixelplumbing.com/api-operation/#autoorient) is applied before the [extraction](https://sharp.pixelplumbing.com/api-resize/#extract). Tests cover wide, square, portrait, odd-sized and EXIF-rotated inputs, mirror direction, untouched backup bytes, retakes, corrupt files and branded output framing.

Before the next event: install the update, connect the Canon, take a test photo, and compare the edges of live view and the captured result. Repeat with the MacBook camera if it will be used as a fallback.
