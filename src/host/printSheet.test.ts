import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getLayout } from "../shared/catalog";
import { prepareCustomOverlay } from "./customOverlay";
import { createPrintSheet } from "./deliverables";

describe("physical print-sheet sizes", () => {
  it.each([
    { printSize: "2x4" as const, height: 1200, top: 300 },
    { printSize: "2x6" as const, height: 1800, top: 0 },
  ])(
    "duplicates $printSize at actual size with equal top/bottom margins",
    async ({ printSize, height, top }) => {
      const directory = await mkdtemp(join(tmpdir(), "wanderbooth-print-test-"));
      try {
        const compositePath = join(directory, "strip.png");
        const outputPath = join(directory, "print.png");
        await sharp({
          create: { width: 600, height, channels: 3, background: "#a81724" },
        })
          .png()
          .toFile(compositePath);
        await createPrintSheet({
          compositePath,
          outputPath,
          printSize,
          canvasWidth: 600,
          canvasHeight: height,
        });
        const metadata = await sharp(outputPath).metadata();
        expect(metadata).toMatchObject({ width: 1200, height: 1800, density: 300 });
        const left = await sharp(outputPath)
          .extract({ left: 0, top, width: 600, height })
          .raw()
          .toBuffer();
        const right = await sharp(outputPath)
          .extract({ left: 600, top, width: 600, height })
          .raw()
          .toBuffer();
        expect(left.equals(right)).toBe(true);
        const pixel = async (x: number, y: number) => [
          ...(await sharp(outputPath)
            .extract({ left: x, top: y, width: 1, height: 1 })
            .removeAlpha()
            .raw()
            .toBuffer()),
        ];
        expect(await pixel(0, top)).toEqual([168, 23, 36]);
        expect(await pixel(1199, top + height - 1)).toEqual([168, 23, 36]);
        if (top) {
          expect(await pixel(600, top - 1)).toEqual([255, 255, 255]);
          expect(await pixel(600, top + height)).toEqual([255, 255, 255]);
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );

  it("keeps a full landscape 4×6 layout at 1800×1200", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wanderbooth-print-test-"));
    try {
      const compositePath = join(directory, "layout.png");
      const outputPath = join(directory, "print.png");
      await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "#3572c4" } })
        .png()
        .toFile(compositePath);
      await createPrintSheet({
        compositePath,
        outputPath,
        printSize: "4x6",
        canvasWidth: 1800,
        canvasHeight: 1200,
      });
      expect(await sharp(outputPath).metadata()).toMatchObject({
        width: 1800,
        height: 1200,
        density: 300,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("imports transparent 2×4 artwork but rejects a 2×6 frame for that layout", async () => {
    const layout = getLayout("vertical-2x4");
    if (!layout) throw new Error("Missing Classic 2×4");
    const source = await sharp({
      create: { width: 600, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const prepared = await prepareCustomOverlay(source, layout, "transparent_artwork");
    expect(await sharp(prepared).metadata()).toMatchObject({ width: 600, height: 1200 });
    const wrongSize = await sharp(source).resize(600, 1800, { fit: "fill" }).png().toBuffer();
    await expect(prepareCustomOverlay(wrongSize, layout, "transparent_artwork")).rejects.toThrow(
      "600×1200",
    );
  });
});
