// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getLayout } from "../shared/catalog";
import { type BoothState, initialBoothState } from "../shared/session";
import { prepareCustomOverlay } from "./customOverlay";
import { buildDeliverables } from "./deliverables";

const layoutId = "double-strip-8-photo-4x6";
describe("eight-photo double-strip output", () => {
  it("requires whole-sheet 4×6 artwork, not a single strip or physical 2×8 canvas", async () => {
    const layout = getLayout(layoutId);
    if (!layout) throw new Error("Missing eight-photo double strip");
    const source = await sharp({
      create: {
        width: 1200,
        height: 1800,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    expect(
      await sharp(await prepareCustomOverlay(source, layout, "transparent_artwork")).metadata(),
    ).toMatchObject({ width: 1200, height: 1800, hasAlpha: true });
    for (const height of [1800, 2400]) {
      const wrong = await sharp(source).resize(600, height, { fit: "fill" }).png().toBuffer();
      await expect(prepareCustomOverlay(wrong, layout, "transparent_artwork")).rejects.toThrow(
        "1200×1800",
      );
    }
  });

  it("renders all eight distinct photos in the right positions and preserves them in the 300-DPI print", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wanderbooth-eight-output-"));
    try {
      const layout = getLayout(layoutId);
      if (!layout) throw new Error("Missing eight-photo double strip");
      const colors = [
        [220, 20, 30],
        [20, 180, 40],
        [30, 40, 210],
        [190, 150, 20],
        [180, 30, 190],
        [20, 170, 180],
        [120, 70, 25],
        [70, 80, 90],
      ];
      const state: BoothState = {
        ...initialBoothState(),
        sessionId: "eight-render",
        layoutId,
        productId: "three-photo-strip",
        requiredCaptureCount: 8,
        designId: "ruby-cream",
        overlayId: "none",
        frameMode: "color",
      };
      for (const [index, [r, g, b]] of colors.entries()) {
        await sharp({ create: { width: 480, height: 360, channels: 3, background: { r, g, b } } })
          .png()
          .toFile(join(directory, `capture-${index}.png`));
        state.captures.push({
          slot: index + 1,
          revision: 1,
          capturedAt: "2026-10-23T00:00:00Z",
          mediaUrl: `/media/capture-${index}.png`,
        });
      }
      const files = await buildDeliverables(state, directory);
      expect(files.filter((file) => file.kind === "individual")).toHaveLength(8);
      for (const kind of ["strip", "print"] as const) {
        const file = files.find((item) => item.kind === kind);
        if (!file) throw new Error(`Missing ${kind}`);
        const path = join(directory, file.mediaUrl.replace("/media/", ""));
        expect(await sharp(path).metadata()).toMatchObject({
          width: 1200,
          height: 1800,
          density: 300,
        });
        for (const [index, slot] of layout.slots.entries()) {
          const center = await sharp(path)
            .extract({
              left: slot.x + slot.width / 2,
              top: slot.y + slot.height / 2,
              width: 1,
              height: 1,
            })
            .removeAlpha()
            .raw()
            .toBuffer();
          expect([...center]).toEqual(colors[index]);
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
