# ADR 0017: Build freeform custom layouts from independently mapped photo holders

**Status:** Accepted

**Date:** 2026-10-02

**Extends:** [ADR 0016](0016-reusable-template-gallery.md)

## Context

The five built-in layouts cover common strips and cards, but event artwork may contain a different number, size, or arrangement of photo openings. Rebuilding the application catalog for every commissioned frame would make preparation slow and code-dependent.

Some designs also repeat one captured image in several places. A holder is therefore not the same thing as a capture: two holders can both display Capture 1 while needing different positions, sizes, rotations, crops, and lock states.

## Decision

- The Template Gallery offers template-only portrait and landscape 4×6 base canvases. These blank bases never appear as normal manual session products.
- Staff may add between one and eight rectangular photo holders to a custom template.
- Every custom holder has a stable ID and a `captureIndex`. Holder identity owns its transforms; `captureIndex` selects the source photo displayed inside it.
- Several holders may reference the same capture. For example, `1, 1, 2, 3` means four visible holders and three actual captures.
- Capture labels are normalized into a continuous sequence after reassignment or removal. A template cannot request Capture 3 without Captures 1 and 2.
- The required capture count is the highest normalized label, not the number of holders.
- Artwork remains above the holders. The direct canvas continues to move, resize, rotate, crop, and lock every holder independently.
- Custom holder definitions and holder-keyed transforms persist in schema version 11 and are used by both the responsive preview and full-resolution renderer.
- Custom templates support one to eight holders in this phase. More holders, arbitrary masks, z-order controls, text layers, copy/paste, alignment guides, and keyboard nudging remain future editor work.

## Consequences

- Staff can prepare uncommon event compositions without asking a developer to add a new hard-coded layout.
- One source capture may be repeated without coupling the repeated copies' geometry.
- The capture flow remains simple because the Host still receives one continuous sequence with no skipped numbers.
- Imported artwork is still tied to its portrait or landscape canvas size, while holder geometry belongs to the saved template rather than to the artwork asset.
- Switching saved templates after capture must match both the canvas layout and required capture count; otherwise a controlled restart is required.

## Verification

- State-machine tests cover repeated capture labels, independent transforms for repeated holders, and the eight-holder limit.
- A browser test created a portrait template with four holders mapped as `1, 1, 2, 3`, saved it, and confirmed it appears as a three-photo session choice.
- The renderer resolves the capture by `captureIndex` and the geometry by stable holder ID.
