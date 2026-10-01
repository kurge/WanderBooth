# WanderBooth Layouts, Frames, and Overlays

**Status:** Working Phase 0 catalog

**Version:** 0.2.0

**Updated:** 2026-10-02

WanderBooth separates three ideas that are often combined into one flattened “template” image:

1. **Layout:** where each captured photo appears, how many unique photos are required, the canvas orientation, and whether a capture is repeated.
2. **Frame:** the background and accent color treatment surrounding the photos.
3. **Overlay:** optional foreground decoration drawn above the photos and frame, such as film perforations, confetti, or hearts.

This separation lets one layout work with many colors and event themes without duplicating the photo-placement logic.

## Current menu

### Products and layouts

| Product | Layout | Output | Unique captures | Important behavior |
|---|---|---:|---:|---|
| Three-photo strip | Classic 2×6 | 600×1800 | 3 | One normal vertical strip |
| Three-photo strip | Double strip 4×6 | 1200×1800 | 3 | Repeats the same three captures on two identical cut strips |
| Four-photo card | Feature portrait | 1200×1800 | 4 | Three smaller photos and one large feature photo |
| Four-photo card | Heart feature | 1200×1800 | 4 | Three rectangles and one heart-shaped photo |
| Four-photo card | Party landscape | 1800×1200 | 4 | Three photos across the top and one larger photo below |

### Frames

- Wander Splash
- Blue Pop
- Press Orange
- Midnight Film
- Ruby Cream

### Overlays

- No overlay
- Film edge
- Party confetti
- Love hearts

The application shows only overlays compatible with the selected layout. A frame or overlay can be changed during review without retaking successful photos.

The Mac operator can also import a PNG, JPEG, or WebP event design after choosing a layout. Imported designs are stored only in WanderBooth's private local runtime data, survive application restarts, and are not committed to GitHub.

## What the supplied sample templates taught us

The six PNGs in `/Users/kurgegarcia/Downloads/Sample Templates` were inspected as layout references:

- five are 1200×1800 portrait canvases;
- one is an 1800×1200 landscape canvas;
- they demonstrate repeated double strips, four-photo collages, a large feature photo, and a heart-shaped slot; and
- all six are flattened RGB PNGs with no alpha channel.

Because the white, black, pink, or red photo placeholders and example subjects are baked into the pixels, these files cannot be used unchanged as transparent overlays. WanderBooth now offers **Flat template** import: it scales a compatible file to the selected canvas and automatically removes the layout's photo-slot shapes before saving the resulting transparent PNG. Sample Template 1 was verified end to end with the Double strip 4×6 layout. Source sample files remain outside the public repository.

Automatic cutouts remove everything inside a photo slot, including any decoration that overlaps that slot. For exact control over overlapping borders, names, dates, or illustrations, export proper transparent artwork instead.

## Importing an event frame

1. Start a session from the Mac operator screen.
2. Choose the product and layout first.
3. In **Overlay**, open **Import an event frame** and choose a PNG, JPEG, or WebP file up to 25 MB.
4. Give the design a recognizable event name.
5. Choose **Flat template** for an opaque or flattened design like the supplied samples, or **Transparent artwork** for a file that already has clear photo openings.
6. Select **Import and select**. WanderBooth validates the aspect ratio, converts the design to the exact layout dimensions, stores it locally, and adds it to that layout's overlay menu.

Only the operator screen exposes the import control. In Self-Service mode, a guest may select a frame that the operator already imported, but cannot add files.

## Production-ready transparent artwork

A custom artwork overlay should be exported as a transparent PNG with:

- exactly the same pixel dimensions as its target layout;
- transparent pixels everywhere a customer photo must remain visible;
- only foreground artwork, borders, logos, event names, or decorations in opaque pixels;
- RGB/RGBA color, preferably 8-bit;
- important text and logos kept inside the printer-safe area; and
- no example people, pets, placeholder colors, or copyrighted reference artwork baked into the file.

Recommended working files keep these layers separate:

```text
Event template source
├── slot guide layer (not exported)
├── background/frame layer
├── optional transparent overlay layer
├── logo/text layer
└── safe-area and cut guides (not exported unless intentionally visible)
```

WanderBooth rejects wrong aspect ratios, opaque files submitted as transparent artwork, unsupported file types, empty uploads, and files larger than 25 MB. Imported images are normalized to PNG and tied to one selected layout. Layout association is deliberate: the same artwork should be imported again for another layout so its placement can be reviewed independently.

## Adding a built-in layout safely

Every built-in layout definition records:

- canvas width and height;
- print size and orientation;
- required unique capture count;
- each photo slot's position, size, shape, and source capture index; and
- one or more branding areas.

A repeated source capture is intentional. For example, the double-strip layout has six visible slots but only three unique captures because the left and right strips use the same capture indices.

Before a new layout becomes customer-facing:

1. render it with synthetic test photos;
2. inspect every crop and shaped mask at full resolution;
3. verify the required photo count and automatic capture sequence;
4. test every compatible overlay;
5. print at actual size and check safe margins and cut lines; and
6. add the result to the compatibility/test record.
