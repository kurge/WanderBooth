import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Layout } from "../shared/catalog";
import { prepareCustomOverlay, renderCustomOverlay } from "./customOverlay";

const testLayout: Layout = {
  id: "test-layout",
  name: "Test layout",
  description: "Small test canvas.",
  requiredCaptureCount: 1,
  printSize: "4x6",
  canvasWidth: 120,
  canvasHeight: 180,
  slots: [{ captureIndex: 0, x: 20, y: 30, width: 80, height: 90, shape: "rectangle" }],
  brandAreas: [{ x: 20, y: 130, width: 80, height: 30, align: "center" }],
};

const alphaAt = async (image: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3];
};

describe("custom overlay preparation", () => {
  it("turns an opaque flat template into a frame with transparent photo openings", async () => {
    const source = await sharp({
      create: { width: 120, height: 180, channels: 3, background: "#d7263d" },
    })
      .png()
      .toBuffer();
    const output = await prepareCustomOverlay(source, testLayout, "flat_template");
    expect(await alphaAt(output, 1, 1)).toBe(255);
    expect(await alphaAt(output, 60, 60)).toBe(0);
  });

  it("rejects an opaque file when transparent artwork mode is selected", async () => {
    const source = await sharp({
      create: { width: 120, height: 180, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await expect(prepareCustomOverlay(source, testLayout, "transparent_artwork")).rejects.toThrow(
      "needs clear pixels",
    );
  });

  it("preserves a correctly sized transparent artwork file", async () => {
    const source = await sharp({
      create: { width: 120, height: 180, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="120" height="180"><rect width="120" height="12" fill="#3572c4" /></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();
    const output = await prepareCustomOverlay(source, testLayout, "transparent_artwork");
    expect(await alphaAt(output, 10, 5)).toBe(255);
    expect(await alphaAt(output, 60, 60)).toBe(0);
  });

  it("moves imported artwork while keeping flat-template photo openings fixed", async () => {
    const source = await sharp({
      create: { width: 120, height: 180, channels: 4, background: "#d7263d" },
    })
      .png()
      .toBuffer();
    const output = await renderCustomOverlay(source, testLayout, "flat_template", {
      offsetX: 0.25,
      offsetY: 0,
      scale: 1,
    });
    expect(await alphaAt(output, 5, 5)).toBe(0);
    expect(await alphaAt(output, 40, 5)).toBe(255);
    expect(await alphaAt(output, 60, 60)).toBe(0);
  });

  it("rejects artwork with the wrong aspect ratio", async () => {
    const source = await sharp({
      create: { width: 180, height: 120, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await expect(prepareCustomOverlay(source, testLayout, "flat_template")).rejects.toThrow(
      "needs a 120×180 canvas",
    );
  });
});
