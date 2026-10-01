# ADR 0014: Use six unique strip shots and full direct object transforms

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The matching/repeated Double strip behavior in ADR 0009, the uniform-scale transform shape in ADR 0012, and the slider-assisted editing limits in ADR 0013.

## Context

The Double strip 4×6 was originally modeled as three captures repeated into two matching strips. The intended product is instead six different shots: three on the left strip and three on the right.

The direct editor also remained too limited. Uniform corner scaling could not reshape a photo holder to fit an imported opening, the Zoom slider did not match the requested canvas interaction, and operators could neither rotate nor protect finished placements. Imported frames also had no deletion workflow. Finally, source-photo placeholders used a portrait footprint while camera captures became short landscape cards, making the capture sequence jump visually.

## Decision

### Double strip capture mapping

Double strip 4×6 requires six unique captures:

```text
Left 2×6 strip    Right 2×6 strip
Photo 1           Photo 4
Photo 2           Photo 5
Photo 3           Photo 6
```

The Host derives `requiredCaptureCount = 6` from the layout and runs the same synchronized three-second countdown before every shot. Processing creates six branded individual photos, one composite sheet, and a six-photo slideshow.

### Direct transform model

Every imported artwork, photo frame, and image-crop target uses:

```text
MediaTransform
├── offsetX   (-1.0 … +1.0, fraction of base width)
├── offsetY   (-1.0 … +1.0, fraction of base height)
├── scaleX    (0.2 … 4.0)
├── scaleY    (0.2 … 4.0)
├── rotation  (-180° … +180°)
└── locked    (true or false)
```

- Dragging the object moves it.
- Edge handles change one dimension; corner handles change both dimensions.
- The round handle rotates the selected object.
- Crop image mode exposes the image's own handles instead of a zoom slider.
- Lock removes manipulation handles and prevents accidental pointer edits until the operator chooses Unlock.
- Reset is disabled while the object is locked.

The Host remains authoritative and persists all transform values. The browser preview uses nested CSS transforms; the Sharp renderer independently applies resize, rotation, placement, mask, and artwork compositing at full output resolution. Editor controls never appear in exports.

Schema version 8 migrates a legacy `scale` value to equal `scaleX` and `scaleY`, with zero rotation and an unlocked state.

### Imported-frame deletion

Every imported-frame choice has an operator-only Delete control. Deletion requires explicit confirmation, removes the item from Host state, and deletes both the normalized source and preview files under private runtime storage. If the deleted frame was selected, the current selection becomes incomplete until another frame is chosen. The owner's original file outside WanderBooth is untouched.

### Capture-preview footprint

Captured and waiting cards use the same 16:9 box. Captures use `object-fit: contain`, so the complete saved image remains visible and any aspect-ratio difference appears as a controlled letterbox rather than changing card height.

## Consequences

- A Double strip session takes longer because it has six countdowns and captures, but produces two different strips as intended.
- Operators can match irregular imported openings without returning to the artwork source for small placement corrections.
- Independent scaling can distort an image; the operator sees the exact result before approval and can reset the selected target.
- Rotation can expose neutral canvas at the corners of a photo frame. The final-layout preview makes this visible.
- Deleting an imported frame is intentionally destructive inside WanderBooth and cannot be undone.

## Revisit when

- the business adds an optional matching-copy double-strip product;
- aspect-ratio locking or keyboard modifiers are needed;
- undo/redo or reusable pre-session calibration becomes necessary; or
- pinch gestures are required after physical touchscreen testing.
