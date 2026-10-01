# ADR 0011: Review the final composition and persist custom-frame alignment

**Status:** Accepted

**Date:** 2026-10-02

**Supersedes:** The ADR 0010 rule that transparent imported artwork stacks on a generated color frame. Every imported design is now the complete custom-frame path.

## Context

Imported event artwork and captured camera images do not always align perfectly with a layout's declared cutouts. A flattened design may place its apparent photo openings a few pixels away from the built-in slot geometry, and a camera's aspect ratio may need a different crop for each person. The previous review screen showed only portrait-shaped source cards with `object-fit: cover`, so it both hid part of each saved image and failed to show the customer the finished layout they were approving.

The editor must remain understandable to a non-developer, must not alter raw captures, and must produce the same result in the on-screen preview and full-resolution export.

## Requirements and assumptions

- A session uses exactly one frame source: a fixed colored frame or an imported custom frame.
- Built-in film, confetti, and heart treatments belong to the fixed-color path only.
- Imported-frame alignment is an attendant/owner action even during Self-Service sessions.
- The original capture files remain unchanged; alignment is non-destructive rendering metadata.
- One transform belongs to each unique capture, not each repeated visible slot. A double strip therefore adjusts both copies of Photo 1 together.
- Phase 0 needs pan and uniform scale, not rotation, perspective distortion, freeform masks, or arbitrary slot editing.

## Decision

The review screen makes the finished composition its primary artifact and shows full-aspect source captures separately for retake decisions. For a custom frame, the operator selects **Frame** or a numbered photo and manipulates it directly with drag, zoom, or reset controls.

The Host stores normalized transforms:

```text
MediaTransform
├── offsetX  (-1.0 … +1.0, fraction of target width)
├── offsetY  (-1.0 … +1.0, fraction of target height)
└── scale    (0.5 … 3.0, where 1.0 is the default fit)

BoothState
├── frameMode: color | custom
├── frameTransform: MediaTransform
└── photoTransforms[]: { slot, offsetX, offsetY, scale }
```

Offsets are dimensionless so the same state drives a responsive browser preview and a 300-DPI render without storing screen pixels.

```text
Operator drag / zoom
        │
        ▼
React composition preview ── command ──► authoritative Host reducer
        ▲                                      │
        │                                      ├── role + phase + bounds checks
        │                                      ├── SQLite state/event persistence
        └──────────── WebSocket state ◄────────┘
                                               │
                                               ▼
                                      full-resolution renderer
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
              transformed capture slots                  transformed custom frame
                         └─────────────────────┬─────────────────────┘
                                               ▼
                                    final branded PNG / print file
```

The browser keeps temporary draft values while a pointer is moving and sends the final transform when the drag ends. The Host accepts transform commands only from staff, only during review, and only while a custom frame is active. The reducer rejects non-finite values and values outside the supported bounds.

The importer stores two local PNGs:

- a normalized source used for future non-destructive frame transforms; and
- an identity-position rendered preview used by thumbnails and backwards-compatible display.

For flat templates, the Host transforms the normalized source first and then removes the fixed layout slots. For transparent artwork, it transforms the normalized RGBA artwork directly. In both cases, a custom frame replaces generated color/branding layers instead of combining with them.

## Rendering order

```text
Fixed colored frame
  generated background → transformed photos → outlines/branding → built-in decoration

Imported flat template
  neutral canvas → transformed photos → transformed source with fixed slot cutouts

Imported transparent artwork
  neutral canvas → transformed photos → transformed transparent artwork
```

Each photo starts from a cover fit for its target slot. Its stored scale and offsets are then applied before the rectangle, rounded, or heart mask. Repeated layout slots find their transform through the shared capture index.

## Alternatives considered

- **Edit the source image in another application:** visually powerful, but too slow during a paid session and does not solve per-guest photo crops.
- **Store browser pixel coordinates:** simple initially, but incorrect across iPad, laptop, responsive resizing, and print resolution.
- **Give every visible slot a separate transform:** more flexible, but unnecessarily lets the two copies of a double strip disagree and creates more controls than the operator needs.
- **Allow customers to align artwork:** possible later, but risky for queue speed and accidental output changes in the cash-only pilot.
- **Modify raw captures:** rejected because it makes retakes, alternate layouts, and recovery destructive.

## Trade-offs

- Scale below 100% can expose empty canvas if the source no longer covers a slot. This is intentional for recovery and visible in the final preview; the operator must approve the result.
- Flat-template auto-cutouts still follow declared layout geometry. Moving the artwork helps align baked-in openings, but arbitrary cutout editing needs a future visual template authoring tool.
- The React preview approximates masks and typography with CSS while the Host uses Sharp and SVG at final resolution. Normalized transforms and slot geometry are shared, but exact color/text rasterization can differ slightly.
- Persisting every final drag and zoom increases session events, but provides recovery and explains how an output was composed.

## Revisit when

- operators need to resize or redraw photo-slot geometry;
- rotation, crop aspect changes, perspective, or per-copy double-strip edits are requested;
- customer-controlled composition becomes an explicit Self-Service feature;
- event templates need a reusable calibration profile before sessions start; or
- preview-versus-print comparisons show that the CSS approximation needs a Host-rendered live preview image.
