# ADR 0013: Edit the composition through direct canvas manipulation

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The button-first Holder/Image interaction in ADR 0012. ADR 0012's persisted transform and rendering model remains unchanged.

**Interaction update:** ADR 0014 supersedes uniform corner scaling and the postponed-rotation decision in this record. Direct selection and rendering ownership remain unchanged.

## Context

The first composition editor required the operator to choose Frame, Holder, or Image from a control panel and then drag an otherwise static preview. Although the underlying transforms were independent, that workflow did not match the requested mental model. The operator expects the composition itself to behave like a design canvas: select the visible object, move it where it belongs, and resize it from the object boundary.

The editor must remain usable with a mouse on the Mac and by touch on a future operator touchscreen. It must also preserve the exact 300-DPI rendering behavior already enforced by the Host.

## Decision

The operator review uses a direct-manipulation composition canvas for imported custom frames:

- clicking or tapping a photo selects its complete masked photo frame;
- dragging the selected frame moves it directly;
- four visible corner handles resize it uniformly while preserving the slot's aspect ratio;
- double-clicking a photo enters Crop image mode; the contextual **Crop image** button provides the equivalent touch-friendly action;
- in Crop image mode, dragging repositions the captured image inside its frame and direct handles resize it;
- clicking outside the photo openings or choosing **Artwork** selects the imported design for the same move and resize interactions;
- **Reset** affects only the selected object; and
- selection outlines, labels, handles, and hints are editor-only and never enter the final render.

The direct editor continues to send the existing normalized frame, holder, and image-transform commands to the authoritative Host. It does not introduce browser-only layout state. Repeated layout slots that use the same capture number display synchronized selections and reuse one stored frame and image transform.

Pointer movement must exceed four screen pixels before it changes an object, so an ordinary selection click does not nudge the composition. Pointer cancellation, a lost pointer capture, or a released mouse button ends the interaction safely and commits the latest valid transform.

## Rendering and permissions

The rendering order remains capture, masked photo frame, then transparent imported artwork. Direct editing changes no z-order: imported artwork stays above all photos in the responsive preview and full-resolution export.

Composition editing remains available only to staff during review and only for imported custom frames. Customer and display-only clients cannot submit these commands.

## Consequences

- The visible composition now acts as the primary control instead of a list of abstract targets.
- Mouse and touch operators can discover selection and resizing from familiar bounding boxes and corner handles.
- ADR 0014 removes the Zoom slider, adds independent width/height handles, rotation, and persistent locks. Perspective, arbitrary masks, keyboard nudging, and pinch gestures remain future enhancements.
- Because the Host transform schema is unchanged, saved sessions and the final renderer remain backward-compatible.

## Revisit when

- operators need rotation or independent width and height resizing;
- touch testing shows that pinch-to-zoom is necessary;
- imported artwork needs layers rather than one flattened transparent image; or
- keyboard shortcuts and undo/redo become important for event setup.
