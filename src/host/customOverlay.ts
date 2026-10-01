import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import type { CustomOverlay, CustomOverlayMode, Layout, PhotoSlot } from "../shared/catalog.js";

const heartPath = "M50 94 C42 86 4 61 4 29 C4 5 34 -7 50 17 C66 -7 96 5 96 29 C96 61 58 86 50 94 Z";

const slotCutout = (slot: PhotoSlot) => {
  if (slot.shape === "heart") {
    return `<svg x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${heartPath}" fill="white" /></svg>`;
  }
  const radius =
    slot.shape === "rounded" ? Math.round(Math.min(slot.width, slot.height) * 0.055) : 0;
  return `<rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="${radius}" fill="white" />`;
};

const cutoutMask = (layout: Layout) =>
  Buffer.from(`
    <svg width="${layout.canvasWidth}" height="${layout.canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      ${layout.slots.map(slotCutout).join("")}
    </svg>
  `);

const assertCompatibleAspectRatio = (inputWidth: number, inputHeight: number, layout: Layout) => {
  const inputRatio = inputWidth / inputHeight;
  const layoutRatio = layout.canvasWidth / layout.canvasHeight;
  const ratioDifference = Math.abs(inputRatio - layoutRatio) / layoutRatio;
  if (ratioDifference > 0.015) {
    throw new Error(
      `This artwork is ${inputWidth}×${inputHeight}, but ${layout.name} needs a ${layout.canvasWidth}×${layout.canvasHeight} canvas or the same aspect ratio.`,
    );
  }
};

export async function prepareCustomOverlay(
  source: Buffer,
  layout: Layout,
  importMode: CustomOverlayMode,
) {
  const image = sharp(source, { failOn: "warning" }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("WanderBooth could not read the artwork dimensions.");
  }
  assertCompatibleAspectRatio(metadata.width, metadata.height, layout);

  const normalized = await image
    .resize(layout.canvasWidth, layout.canvasHeight, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();

  if (importMode === "transparent_artwork") {
    const stats = await sharp(normalized).stats();
    const alpha = stats.channels[3];
    if (!alpha || alpha.min > 250) {
      throw new Error(
        "Transparent artwork needs clear pixels where the guest photos should remain visible. Try Flat template instead.",
      );
    }
    return normalized;
  }

  return sharp(normalized)
    .composite([{ input: cutoutMask(layout), blend: "dest-out" }])
    .png()
    .toBuffer();
}

export async function importCustomOverlay(input: {
  source: Buffer;
  dataDirectory: string;
  layout: Layout;
  importMode: CustomOverlayMode;
  name: string;
}): Promise<CustomOverlay> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) {
    throw new Error("Give the imported design a name between 1 and 80 characters.");
  }

  const output = await prepareCustomOverlay(input.source, input.layout, input.importMode);
  const id = `custom-${randomUUID()}`;
  const overlayDirectory = join(input.dataDirectory, "overlays");
  const filename = `${id}.png`;
  await mkdir(overlayDirectory, { recursive: true });
  await writeFile(join(overlayDirectory, filename), output);

  return {
    id,
    name,
    description:
      input.importMode === "flat_template"
        ? `Imported flat template for ${input.layout.name}; photo openings were cut automatically.`
        : `Imported transparent artwork for ${input.layout.name}.`,
    kind: "custom",
    layoutIds: [input.layout.id],
    mediaUrl: `/media/overlays/${filename}`,
    importMode: input.importMode,
    pixelWidth: input.layout.canvasWidth,
    pixelHeight: input.layout.canvasHeight,
  };
}
