# ADR 0009: Data-Driven Layout, Frame, and Overlay Catalog

> **Update:** ADR 0014 supersedes this record's matching/repeated Double strip mapping. The data-driven catalog decision remains accepted, but Double strip 4×6 now maps six unique captures to its six slots.

- Status: Accepted
- Date: 2026-10-02

## Decision

WanderBooth will model photo placement, frame styling, and foreground decoration as separate catalog entities.

```text
Product
  └── allows one or more Layouts
          ├── canvas size and orientation
          ├── required unique capture count
          ├── photo slots → capture indices
          └── branding areas

Frame → background and accent colors

Overlay → optional foreground decoration
          └── compatible layout IDs
```

The selected layout remains the source of truth for how many photos the Host captures. A visible slot points to a capture index, which allows one capture to appear more than once. This is how the 4×6 double-strip layout repeats three captures into two identical 2×6 strips without taking six photos.

The renderer composes layers in this order:

```text
frame background
    ↓
cropped and shaped customer-photo slots
    ↓
slot borders, cut guides, and selected overlay
    ↓
WanderBooth branding
```

## Requirements

- Customers and attendants can choose among product-compatible layouts.
- The photo count changes automatically with the layout and is never an independent choice.
- A layout can use portrait or landscape output, rectangles, rounded rectangles, and heart-shaped slots.
- Frames and compatible overlays can change during review without retaking photos.
- The renderer fails instead of silently omitting a referenced capture.
- Synthetic rendering tests must cover repeated slots and shaped masks before printing begins.
- Reference templates containing flattened placeholders or example subjects are never treated as production overlay assets.

## Why

- Hard-coded coordinates in one renderer would make every new template a code rewrite.
- Separating geometry from artwork lets the business reuse layouts across events and frame palettes.
- Explicit capture indices support double strips and future layouts that intentionally repeat a photo.
- Compatibility filtering prevents an overlay designed for one canvas from being stretched over another.

## Trade-offs and limits

- The current catalog is version-controlled and built into the app. Adding arbitrary artwork without a release still needs a staff-only local importer.
- Built-in overlays are generated foreground graphics, not the supplied flattened PNGs.
- The first renderer supports rectangle, rounded, and heart masks. More complex clipping paths should be added only when a real approved template requires them.
- Text uses system-safe fonts for predictable packaging. Custom event fonts need licensing and embedding rules.

## Revisit when

- the owner needs to add event overlays without a code change;
- templates require editable guest names, dates, or event fields;
- multiple booths need the same catalog synchronized remotely; or
- a design tool export format replaces hand-authored catalog geometry.
