# Standardizing existing template artwork

This is an asset-preparation step, not an app update. Keep existing shapes and transparent openings; do not stretch a 2×6 frame into 2×4.

| Existing design | Standard PNG size | Resolution metadata |
|---|---:|---:|
| Vertical 2×6 strip | 600×1800 | 300 DPI |
| Portrait 4×6 sheet | 1200×1800 | 300 DPI |
| Landscape 4×6 sheet | 1800×1200 | 300 DPI |

Run from the project folder:

```sh
node scripts/standardize-template-artwork.mjs \
  "Photo Templates/Sample Templates" \
  "Photo Templates/Standardized - 300 DPI"
```

The destination must not already exist. The script checks every source's proportions before creating the folder. Correctly sized 300-DPI images are copied byte-for-byte. Larger matching designs are resized proportionally using the local image processor; there is no cropping, stretching, added border or redrawing. Unsupported aspect ratios are rejected.

Output filenames include the paper size. A local `manifest.json` records original/output dimensions, actions and SHA-256 checksums. The script verifies dimensions, 300-DPI metadata, alpha-channel/transparency retention and unchanged original bytes. All artwork and its local manifest stay under the Git-ignored `Photo Templates/` folder.

## Using the copies in WanderBooth

Import the new copy into a matching-size template. Resizing does not add or remove photo openings, align holders, or automatically replace an already-imported frame. Map and adjust the holders to match the artwork, then save the template. Paper size does not determine whether an individual opening is portrait or landscape.

The 2026-10-23 sample batch contained seven 2×6 strips and three 4×6 sheets. Six strips were already correct and copied unchanged; one strip and three sheets needed proportional resizing. No 2×4 variants were created.
