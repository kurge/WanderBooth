# ADR 0010: Import custom event frames into the local Host

**Status:** Accepted; rendering-mode details partially superseded by [ADR 0011](0011-review-composition-editor.md)

**Date:** 2026-10-02

## Context

WanderBooth needs to use event-specific designs without requiring a developer to edit the built-in catalog. Owner-supplied artwork may be a proper transparent overlay or a flattened image containing example photos and an opaque background. The application remains offline-first, the repository is public, and imported customer/business assets must not be committed.

## Decision

The Mac operator imports artwork only after selecting its target layout. The local Host owns validation, conversion, storage, catalog registration, and final rendering.

```text
Operator selects layout
        │
        ├── chooses PNG/JPEG/WebP + name + import mode
        │
        ▼
Local Host validates size, type, aspect ratio, and transparency mode
        │
        ├── Transparent artwork: preserve existing alpha
        └── Flat template: remove the layout's declared photo-slot shapes
        │
        ▼
Normalize to exact layout dimensions as a transparent PNG
        │
        ├── file: private runtime/overlays/
        └── metadata: persisted Host state
        │
        ▼
Photos → generated frame when applicable → imported artwork
```

An imported frame is compatible with exactly one layout. It receives a unique identifier and is broadcast in shared booth state so both the operator and Self-Service customer menu see the same approved catalog. The import control itself appears only on the operator screen.

ADR 0011 now treats both imported modes as the complete custom-frame path rather than combining transparent artwork with a selected generated color frame. Flat templates still receive layout-derived cutouts, while transparent artwork keeps its authored alpha.

## Validation and failure behavior

- Accepted source types are PNG, JPEG, and WebP.
- Maximum source size is 25 MB.
- The source must match the target layout's aspect ratio within 1.5%; compatible artwork is normalized to the exact pixel dimensions.
- Transparent-artwork mode requires at least some non-opaque pixels.
- Files remain under ignored local runtime data and are served only through the Host's existing guarded media path.
- Invalid files do not alter the current selection or catalog.

## Trade-offs

- Automatic cutouts make existing flat references usable quickly, but remove all pixels inside each slot. Artwork intended to overlap a photo must be supplied as a true transparent overlay.
- Layout-specific imports avoid ambiguous scaling and alignment, but the same visual design must be imported separately for another layout.
- Metadata currently lives in the persisted booth state rather than a dedicated asset table. This is simple for one booth and a small catalog; migrate to dedicated template tables when editing, deletion, tagging, cloud sync, or many hundreds of assets are required.
- Phase 0 screen roles are not authenticated accounts. Hiding import from the customer UI is appropriate for the controlled local pilot, but a PIN-protected owner area must protect asset administration before unattended or multi-tenant use.

## Revisit when

- the owner needs to edit slot geometry visually;
- imported designs need deletion, archival, duplication, or event folders;
- layouts and assets synchronize between multiple booths;
- a remote dashboard manages templates; or
- owner/attendant authentication is implemented.
