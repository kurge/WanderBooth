# ADR 0015: Use proportional corners and non-distorting crop-frame edges

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The unrestricted corner and image-content scaling semantics in ADR 0014.

## Context

The eight-handle editor allowed width and height to change independently from every control. That made a corner feel unlike a familiar Canva-style corner and, more importantly, resizing a photo holder by one axis also stretched the photo pixels inside it. The operator needs two separate actions: scale an object without changing its proportions, or reshape a photo opening without deforming the captured image.

## Decision

- The four corner handles proportionally scale the selected object's current width and height. The opposite corner remains anchored.
- The four pill-shaped middle edge handles move only their corresponding edge. On a photo holder this changes the crop-window geometry.
- Resizing a holder never stretches its photograph. The browser uses an aspect-preserving `cover` image inside the resized, clipped holder.
- The full-resolution renderer mirrors that behavior: it cover-fits the capture into the resized holder before applying proportional image scale, image rotation, masking, holder rotation, and placement.
- Crop image mode exposes only corner handles. Its X/Y scale values are normalized to one uniform value by the Host.
- Schema version 9 migrates older unequal image-crop scale values to the larger of the two values. Holder and artwork X/Y values remain independent.

## Consequences

- Corner dragging behaves predictably and does not change the selected object's shape.
- An operator can still make a holder wider, narrower, taller, or shorter to match a transparent opening.
- The image may be cropped more when the holder ratio changes, but faces and other content are not stretched.
- Previously distorted image transforms are repaired on load while customized holder bounds remain intact.
- Artwork can still be reshaped from middle handles when alignment requires it; production artwork should normally be exported at the correct layout ratio.

## Revisit when

- crop focal-point controls need safe-area indicators;
- keyboard modifiers are added for alternate scaling behavior; or
- freeform masks or perspective correction are introduced.
