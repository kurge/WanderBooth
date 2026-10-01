# WanderBooth Layouts, Frames, and Overlays

**Status:** Working Phase 0 catalog

**Version:** 0.6.1

**Updated:** 2026-10-02

WanderBooth separates three ideas that are often combined into one flattened “template” image:

1. **Layout:** where each captured photo appears, how many unique photos are required, the canvas orientation, and whether a capture is repeated.
2. **Frame:** either a generated fixed-color WanderBooth treatment or one imported custom event design. These are mutually exclusive choices.
3. **Built-in decoration:** an optional film, confetti, or heart treatment available only with a fixed-color frame.

This separation lets one layout work with many colors and event themes without duplicating photo-placement logic. A custom frame never stacks on top of a selected color frame.

## Current menu

### Products and layouts

| Product | Layout | Output | Unique captures | Important behavior |
|---|---|---:|---:|---|
| Photo strip | Classic 2×6 | 600×1800 | 3 | One normal vertical strip |
| Photo strip | Double strip 4×6 | 1200×1800 | 6 | Photos 1–3 fill the left strip; Photos 4–6 fill the right strip |
| Four-photo card | Feature portrait | 1200×1800 | 4 | Three smaller photos and one large feature photo |
| Four-photo card | Heart feature | 1200×1800 | 4 | Three rectangles and one heart-shaped photo |
| Four-photo card | Party landscape | 1800×1200 | 4 | Three photos across the top and one larger photo below |

### Fixed-color frames

- Wander Splash
- Blue Pop
- Press Orange
- Midnight Film
- Ruby Cream

### Built-in decorations

- No overlay
- Film edge
- Party confetti
- Love hearts

The selection screen first asks for **Fixed colored frame** or **Imported custom frame**. Fixed color exposes the color and compatible decoration menus. Imported custom hides the colors and shows only approved custom frames for that layout. Changing one mode clears the incompatible choice, so the final renderer always has one unambiguous frame source.

The Mac operator can also import a PNG, JPEG, or WebP event design after choosing a layout. Imported designs are stored only in WanderBooth's private local runtime data, survive application restarts, and are not committed to GitHub.

## What the supplied sample templates taught us

The six PNGs in `/Users/kurgegarcia/Downloads/Sample Templates` were inspected as layout references:

- five are 1200×1800 portrait canvases;
- one is an 1800×1200 landscape canvas;
- they demonstrate repeated double strips, four-photo collages, a large feature photo, and a heart-shaped slot; and
- all six are flattened RGB PNGs with no alpha channel.

Because the white, black, pink, or red photo placeholders and example subjects are baked into the pixels, these files cannot be used unchanged as transparent overlays. They remain useful references for composing production artwork, but the owner will prepare the transparent photo openings before importing a frame. Source sample files remain outside the public repository.

The Host still understands the earlier **Flat template** records so previously imported test assets do not break. The operator interface no longer offers automatic cutout creation for new imports; transparent artwork is the single production path.

## Importing an event frame

1. Start a session from the Mac operator screen.
2. Choose the product and layout first.
3. Export a PNG at the layout's exact pixel dimensions, with transparent pixels wherever photos should show.
4. Choose **Imported custom frame**, then open **Import an event frame** and choose that PNG file up to 25 MB.
5. Give the design a recognizable event name.
6. Select **Import and select**. WanderBooth verifies that the image contains transparency, validates the aspect ratio, stores a normalized source and rendered preview at the exact layout dimensions, and adds it to that layout's custom-frame menu.

Only the operator screen exposes the import control. In Self-Service mode, a guest may select a frame that the operator already imported, but cannot add files.

## Aligning a custom frame after capture

The review screen places the final composed layout beside the full uncropped capture images. On the operator screen, the composition preview behaves like a direct design canvas:

1. click or tap a photo to select its frame;
2. drag the selected frame directly to move the complete masked photo area;
3. pull a corner handle to scale the selected frame proportionally, or pull a middle edge handle to reshape only that edge of the photo holder to match the imported opening;
4. double-click the photo, or choose **Crop image** on a touchscreen, to edit the captured image inside the frame;
5. drag in Crop image mode to reposition the image and use its corner handles to scale it proportionally;
6. drag the round rotation handle to rotate the selected artwork, photo frame, or image;
7. choose **Artwork** or click outside the photo openings to select and manipulate the imported design;
8. choose **Lock** to protect a finished object from accidental movement, then **Unlock** when it needs another change; and
9. use **Reset** to return only the selected, unlocked object to its centered 100% position.

Moving the artwork adjusts the imported design. Moving, resizing, or rotating a photo frame changes the complete clipped photo area behind that artwork, while Crop image mode changes only the capture inside the area. Corner handles always preserve the selected object's current ratio. The holder's pill-shaped middle handles can change one edge independently, but the photo is cover-fitted into the new crop area and is never stretched. The Double strip uses six independent photos and transforms rather than matching repeated copies. Selection outlines, labels, handles, and lock indicators are editor guides only and never appear in the exported file. The transparent artwork remains above the photos in both preview and export. Position, holder width/height, proportional photo scale, rotation, and lock state are stored in the Host session and the final renderer reuses the visual transforms, so the preview is not a cosmetic-only adjustment.

The operator can delete any imported frame from its custom-frame card or review thumbnail. WanderBooth asks for confirmation, then removes the catalog record plus its local normalized and preview artwork files. Deletion cannot be undone; the original source file outside WanderBooth is not changed.

Only staff can reposition the frame or photos. A Self-Service guest may select an owner-approved imported frame and review the result, but the attendant performs detailed alignment.

## Production-ready transparent artwork

A custom artwork overlay must be exported as a transparent PNG with:

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

Every current visible slot uses one unique capture. In particular, the Double strip 4×6 has six slots and six shots, split between the left and right 2×6 strips.

Before a new layout becomes customer-facing:

1. render it with synthetic test photos;
2. inspect every crop and shaped mask at full resolution;
3. verify the required photo count and automatic capture sequence;
4. test every compatible overlay;
5. print at actual size and check safe margins and cut lines; and
6. add the result to the compatibility/test record.
