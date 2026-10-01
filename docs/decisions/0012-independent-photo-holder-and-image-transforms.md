# ADR 0012: Adjust photo holders separately from their images

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The ADR 0011 assumption that arbitrary slot editing would wait for a future template-authoring tool. Rotation, perspective, freeform masks, and per-copy double-strip editing remain postponed.

## Context

A captured image can be panned and zoomed inside a fixed layout slot, but this is not enough when an imported frame's transparent opening is offset from the built-in slot. Scaling only the image changes its crop while leaving the clipped photo area in the wrong place. The operator needs to correct both layers without editing the raw capture or modifying the transparent artwork during a paid session.

New production frames will already contain transparent photo openings. WanderBooth does not need to generate those cutouts in the normal import flow. The imported artwork must stay above all photos.

## Decision

Each unique capture has two independent transforms:

```text
Photo composition
├── holder transform: moves and scales the complete masked photo area
└── image transform: pans and zooms the capture inside that holder
```

The custom frame keeps its existing independent transform. All three use the same normalized format:

```text
MediaTransform
├── offsetX  (-1.0 … +1.0, fraction of target width)
├── offsetY  (-1.0 … +1.0, fraction of target height)
└── scale    (0.5 … 3.0)

BoothState
├── frameTransform
├── holderTransforms[]: { slot, offsetX, offsetY, scale }
└── photoTransforms[]:  { slot, offsetX, offsetY, scale }
```

The operator review screen labels the two photo targets **Holder** and **Image**. Drag moves the selected target, Zoom scales it, and Reset resets only that target. These controls remain staff-only, review-only, and custom-frame-only.

Transforms are keyed by unique capture number rather than visible layout-slot identity. If Photo 1 appears twice on a double strip, both copies use the same holder and image transforms.

## Rendering order

```text
neutral canvas
  → capture cropped by image transform into its base mask
  → complete masked holder moved/scaled on the output canvas
  → transparent imported frame artwork
```

The Host first renders the image into the layout's base rectangle, rounded rectangle, or heart mask. It then scales and positions that masked buffer around the original holder center. Any portion outside the print canvas is safely cropped. Finally, the transparent frame is composited above every photo.

The responsive browser applies the same normalized transforms to nested elements: the holder wrapper receives the holder transform and its child image receives the image transform. The full-resolution Sharp renderer repeats the same order for the final 300-DPI file.

## Import policy

The operator interface accepts transparent PNG or WebP artwork with openings prepared by the owner. It explains that WanderBooth will not create those openings. The Host retains support for old `flat_template` records and API values so previously imported local test assets remain usable, but that path is hidden from new operator imports.

## Source-photo preview

Filled capture cards preserve their natural image height and align to the start of their grid row. An empty 3:4 waiting placeholder can no longer stretch neighboring landscape cards and create false white space. Source cards remain separate from the cropped final-layout preview.

## Consequences

- The operator can align artwork openings and photo crops independently without changing raw files.
- Repeated copies stay visually consistent and require fewer controls.
- A holder scaled below 100% or moved too far may expose the neutral canvas. The final preview makes this visible before approval.
- Holder geometry is still based on the selected built-in layout. Operators cannot draw new masks, change aspect ratio, rotate, or adjust the two repeated copies separately.
- State schema version 7 adds `holderTransforms`; older saved state migrates with an empty list, which is equivalent to centered 100% holders.

## Revisit when

- production templates require authoring completely new holder shapes or aspect ratios;
- operators request rotation, perspective, or freeform masks;
- repeated copies need deliberately different alignment; or
- a reusable pre-session calibration profile is preferable to per-session adjustment.
