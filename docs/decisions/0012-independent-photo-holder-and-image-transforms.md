# ADR 0012: Adjust photo holders separately from their images

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The ADR 0011 assumption that arbitrary slot editing would wait for a future template-authoring tool. Rotation, perspective, freeform masks, and per-copy double-strip editing remain postponed.

**Interaction update:** ADR 0013 supersedes the button-first interaction described below. The transform and rendering model in this record remains authoritative.

**Transform update:** ADR 0014 replaces the single uniform scale with independent X/Y scaling, rotation, and a lock flag. The holder/image separation and rendering order remain authoritative.

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
MediaTransform (superseded by ADR 0014)
├── offsetX
├── offsetY
└── scale

BoothState
├── frameTransform
├── holderTransforms[]: { slot, offsetX, offsetY, scale }
└── photoTransforms[]:  { slot, offsetX, offsetY, scale }
```

The original operator review used separate **Holder** and **Image** target buttons. ADR 0013 replaces that presentation with direct canvas selection and manipulation while retaining the same Host commands and transforms. These controls remain staff-only, review-only, and custom-frame-only.

Transforms are keyed by capture number rather than browser element identity. ADR 0014 changed the Double strip to six unique captures, so every current visible slot has its own holder and image transforms.

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

ADR 0014 replaces the mixed natural-height/3:4 cards with one consistent 16:9 footprint. Captured images use `contain`, while waiting cards occupy the same dimensions. Source cards remain separate from the cropped final-layout preview.

## Consequences

- The operator can align artwork openings and photo crops independently without changing raw files.
- Every current photo slot can be aligned independently through its unique capture number.
- A holder scaled below 100% or moved too far may expose the neutral canvas. The final preview makes this visible before approval.
- Holder geometry is still based on the selected built-in layout. Operators cannot draw new masks or use perspective distortion. ADR 0014 adds aspect-ratio changes and rotation, and makes all six double-strip slots independent.
- State schema version 7 adds `holderTransforms`; older saved state migrates with an empty list, which is equivalent to centered 100% holders.

## Revisit when

- production templates require authoring completely new holder shapes or aspect ratios;
- operators request perspective or freeform masks;
- a reusable pre-session calibration profile is preferable to per-session adjustment.
