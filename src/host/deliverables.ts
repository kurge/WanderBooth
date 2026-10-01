import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import sharp from "sharp";

import {
  type CustomOverlayMode,
  getDesign,
  getOverlay,
  identityMediaTransform,
  type Layout,
  type MediaTransform,
  type OverlayKind,
  type PhotoSlot,
  photoSlotId,
  resolveLayout,
} from "../shared/catalog.js";
import type {
  BoothState,
  Deliverable,
  HolderTransform,
  PhotoTransform,
} from "../shared/session.js";
import { renderCustomOverlay } from "./customOverlay.js";

const publicMediaUrl = (dataDirectory: string, absolutePath: string) =>
  `/media/${relative(dataDirectory, absolutePath).split("\\").join("/")}`;

const mediaUrlToPath = (dataDirectory: string, mediaUrl: string) => {
  const relativePath = decodeURIComponent(mediaUrl.replace(/^\/media\//, ""));
  const absolutePath = resolve(dataDirectory, relativePath);
  const safeRoot = `${resolve(dataDirectory)}/`;
  if (!`${absolutePath}/`.startsWith(safeRoot) && absolutePath !== resolve(dataDirectory)) {
    throw new Error("Capture path is outside the WanderBooth data directory.");
  }
  return absolutePath;
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });

async function createBrandedIndividual(input: {
  capturePath: string;
  outputPath: string;
  accent: string;
  background: string;
  photoNumber: number;
}) {
  await mkdir(dirname(input.outputPath), { recursive: true });
  const caption = Buffer.from(`
    <svg width="1200" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="100" fill="${input.background}" />
      <circle cx="55" cy="50" r="26" fill="${input.accent}" />
      <text x="98" y="60" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${input.accent}">WanderBooth</text>
      <text x="1145" y="59" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${input.accent}">by Wander Press PH · Photo ${input.photoNumber}</text>
    </svg>
  `);

  await sharp(input.capturePath)
    .resize(1200, 800, { fit: "cover" })
    .extend({ bottom: 100, background: input.background })
    .composite([{ input: caption, top: 800, left: 0 }])
    .png()
    .toFile(input.outputPath);
}

const heartPath = "M50 94 C42 86 4 61 4 29 C4 5 34 -7 50 17 C66 -7 96 5 96 29 C96 61 58 86 50 94 Z";

async function renderSlot(
  photoPath: string,
  slot: PhotoSlot,
  holderTransform: MediaTransform,
  photoTransform: MediaTransform,
) {
  const holderWidth = Math.max(1, Math.round(slot.width * holderTransform.scaleX));
  const holderHeight = Math.max(1, Math.round(slot.height * holderTransform.scaleY));
  const basePhoto = await sharp(photoPath)
    .rotate()
    .resize(holderWidth, holderHeight, { fit: "cover" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const photoScale = Math.max(photoTransform.scaleX, photoTransform.scaleY);
  const scaledWidth = Math.max(1, Math.round(holderWidth * photoScale));
  const scaledHeight = Math.max(1, Math.round(holderHeight * photoScale));
  const transformed = await sharp(basePhoto)
    .resize(scaledWidth, scaledHeight, { fit: "fill" })
    .rotate(photoTransform.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();
  const transformedMetadata = await sharp(transformed).metadata();
  const transformedWidth = transformedMetadata.width ?? scaledWidth;
  const transformedHeight = transformedMetadata.height ?? scaledHeight;
  const desiredLeft = Math.round(
    (holderWidth - transformedWidth) / 2 + photoTransform.offsetX * holderWidth,
  );
  const desiredTop = Math.round(
    (holderHeight - transformedHeight) / 2 + photoTransform.offsetY * holderHeight,
  );
  const cropLeft = Math.max(0, -desiredLeft);
  const cropTop = Math.max(0, -desiredTop);
  const outputLeft = Math.max(0, desiredLeft);
  const outputTop = Math.max(0, desiredTop);
  const visibleWidth = Math.min(transformedWidth - cropLeft, holderWidth - outputLeft);
  const visibleHeight = Math.min(transformedHeight - cropTop, holderHeight - outputTop);
  const canvas = sharp({
    create: {
      width: holderWidth,
      height: holderHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const photo =
    visibleWidth > 0 && visibleHeight > 0
      ? await canvas
          .composite([
            {
              input: await sharp(transformed)
                .extract({
                  left: cropLeft,
                  top: cropTop,
                  width: visibleWidth,
                  height: visibleHeight,
                })
                .png()
                .toBuffer(),
              left: outputLeft,
              top: outputTop,
            },
          ])
          .png()
          .toBuffer()
      : await canvas.png().toBuffer();
  if (slot.shape === "rectangle") return photo;

  const mask =
    slot.shape === "heart"
      ? Buffer.from(`
          <svg width="${holderWidth}" height="${holderHeight}" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="${heartPath}" fill="white" />
          </svg>
        `)
      : Buffer.from(`
          <svg width="${holderWidth}" height="${holderHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${holderWidth}" height="${holderHeight}" rx="${Math.round(Math.min(holderWidth, holderHeight) * 0.055)}" fill="white" />
          </svg>
        `);

  return sharp(photo)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

type PositionedLayer = { input: Buffer; left: number; top: number };

async function positionHolder(
  input: Buffer,
  slot: PhotoSlot,
  transform: MediaTransform,
  canvasWidth: number,
  canvasHeight: number,
): Promise<PositionedLayer | null> {
  const transformed = await sharp(input)
    .rotate(transform.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const transformedMetadata = await sharp(transformed).metadata();
  const transformedWidth = transformedMetadata.width ?? Math.round(slot.width * transform.scaleX);
  const transformedHeight =
    transformedMetadata.height ?? Math.round(slot.height * transform.scaleY);
  const holderCenterX = slot.x + slot.width / 2 + transform.offsetX * slot.width;
  const holderCenterY = slot.y + slot.height / 2 + transform.offsetY * slot.height;
  const desiredLeft = Math.round(holderCenterX - transformedWidth / 2);
  const desiredTop = Math.round(holderCenterY - transformedHeight / 2);
  const cropLeft = Math.max(0, -desiredLeft);
  const cropTop = Math.max(0, -desiredTop);
  const outputLeft = Math.max(0, desiredLeft);
  const outputTop = Math.max(0, desiredTop);
  const visibleWidth = Math.min(transformedWidth - cropLeft, canvasWidth - outputLeft);
  const visibleHeight = Math.min(transformedHeight - cropTop, canvasHeight - outputTop);
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;

  const visible =
    cropLeft === 0 &&
    cropTop === 0 &&
    visibleWidth === transformedWidth &&
    visibleHeight === transformedHeight
      ? transformed
      : await sharp(transformed)
          .extract({ left: cropLeft, top: cropTop, width: visibleWidth, height: visibleHeight })
          .png()
          .toBuffer();
  return { input: visible, left: outputLeft, top: outputTop };
}

const slotOutline = (slot: PhotoSlot, accent: string, strokeWidth: number) => {
  if (slot.shape === "heart") {
    return `<svg x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${heartPath}" fill="none" stroke="${accent}" stroke-width="${strokeWidth / 6}" /></svg>`;
  }
  const radius =
    slot.shape === "rounded" ? Math.round(Math.min(slot.width, slot.height) * 0.055) : 0;
  return `<rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="${radius}" fill="none" stroke="${accent}" stroke-width="${strokeWidth}" />`;
};

const overlayMarkup = (kind: OverlayKind, layout: Layout, accent: string) => {
  const { canvasWidth: width, canvasHeight: height } = layout;
  if (kind === "none" || kind === "custom") return "";
  if (kind === "film") {
    const holeWidth = Math.max(14, Math.round(Math.min(width, height) * 0.025));
    const holeHeight = Math.round(holeWidth * 0.7);
    const step = Math.round(holeHeight * 2.15);
    const xPositions =
      layout.id === "double-strip-4x6"
        ? [
            Math.round(holeWidth * 0.45),
            Math.round(width / 2 - holeWidth * 1.45),
            Math.round(width / 2 + holeWidth * 0.45),
            width - Math.round(holeWidth * 1.45),
          ]
        : [Math.round(holeWidth * 0.45), width - Math.round(holeWidth * 1.45)];
    return Array.from({ length: Math.ceil(height / step) }, (_, index) => {
      const y = index * step + Math.round(holeHeight * 0.45);
      return xPositions
        .map(
          (x) =>
            `<rect x="${x}" y="${y}" width="${holeWidth}" height="${holeHeight}" rx="${Math.round(holeHeight * 0.2)}" fill="${accent}" opacity="0.92" />`,
        )
        .join("");
    }).join("");
  }
  if (kind === "confetti") {
    const palette = [accent, "#fffc02", "#da6319", "#3572c4", "#ddf426"];
    const points = [
      [0.05, 0.05, -18],
      [0.16, 0.035, 24],
      [0.29, 0.06, -35],
      [0.73, 0.045, 18],
      [0.86, 0.07, -28],
      [0.95, 0.035, 32],
      [0.035, 0.46, 18],
      [0.965, 0.52, -22],
      [0.07, 0.94, 30],
      [0.9, 0.95, -30],
    ];
    const size = Math.max(13, Math.round(Math.min(width, height) * 0.018));
    return points
      .map(
        ([x, y, rotation], index) =>
          `<rect x="${Math.round(x * width)}" y="${Math.round(y * height)}" width="${size}" height="${Math.round(size * 0.42)}" rx="${Math.round(size * 0.2)}" fill="${palette[index % palette.length]}" transform="rotate(${rotation} ${Math.round(x * width)} ${Math.round(y * height)})" />`,
      )
      .join("");
  }

  const size = Math.round(Math.min(width, height) * 0.18);
  return `<g fill="none" stroke="${accent}" opacity="0.28" stroke-width="${Math.max(6, Math.round(size * 0.045))}"><svg x="${Math.round(width * 0.72)}" y="${Math.round(height * 0.72)}" width="${size}" height="${size}" viewBox="0 0 100 100"><path d="${heartPath}" /></svg><svg x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.76)}" width="${Math.round(size * 0.66)}" height="${Math.round(size * 0.66)}" viewBox="0 0 100 100"><path d="${heartPath}" /></svg></g>`;
};

async function createComposite(input: {
  capturePaths: string[];
  outputPath: string;
  accent: string;
  background: string;
  designName: string;
  layout: Layout;
  overlayKind: OverlayKind;
  overlayName: string;
  customOverlayPath: string | null;
  customOverlayMode: CustomOverlayMode | null;
  frameTransform: MediaTransform;
  holderTransforms: HolderTransform[];
  photoTransforms: PhotoTransform[];
}) {
  const { canvasWidth: width, canvasHeight: height } = input.layout;
  const strokeWidth = Math.max(6, Math.round(Math.min(width, height) * 0.012));
  const photos = (
    await Promise.all(
      input.layout.slots.map(async (slot) => {
        const photoPath = input.capturePaths[slot.captureIndex];
        if (!photoPath)
          throw new Error(`Layout references missing capture ${slot.captureIndex + 1}.`);
        const captureSlot = slot.captureIndex + 1;
        const holderId = photoSlotId(slot);
        const photoTransform =
          input.photoTransforms.find((item) => item.holderId === holderId) ??
          input.photoTransforms.find((item) => !item.holderId && item.slot === captureSlot) ??
          identityMediaTransform();
        const holderTransform =
          input.holderTransforms.find((item) => item.holderId === holderId) ??
          input.holderTransforms.find((item) => !item.holderId && item.slot === captureSlot) ??
          identityMediaTransform();
        const photo = await renderSlot(photoPath, slot, holderTransform, photoTransform);
        return positionHolder(photo, slot, holderTransform, width, height);
      }),
    )
  ).filter((photo): photo is PositionedLayer => photo !== null);
  const replacesGeneratedFrame = Boolean(input.customOverlayPath);
  const brandMarkup = input.layout.brandAreas
    .map((brandArea) => {
      const brandX = brandArea.align === "center" ? brandArea.x + brandArea.width / 2 : brandArea.x;
      const anchor = brandArea.align === "center" ? "middle" : "start";
      const titleSize = Math.max(
        30,
        Math.round(Math.min(brandArea.width, brandArea.height) * 0.14),
      );
      const detailSize = Math.max(19, Math.round(titleSize * 0.58));
      return `
        <text x="${brandX}" y="${brandArea.y + Math.round(brandArea.height * 0.36)}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="800" fill="${input.accent}">WanderBooth</text>
        <text x="${brandX}" y="${brandArea.y + Math.round(brandArea.height * 0.58)}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${detailSize}" font-weight="700" fill="${input.accent}">${escapeXml(input.designName)}</text>
        <text x="${brandX}" y="${brandArea.y + Math.round(brandArea.height * 0.77)}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(16, Math.round(detailSize * 0.74))}" fill="${input.accent}">Wander Press PH${input.overlayKind === "none" ? "" : ` · ${escapeXml(input.overlayName)}`}</text>
      `;
    })
    .join("");
  const frame = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${replacesGeneratedFrame ? "" : input.layout.slots.map((slot) => slotOutline(slot, input.accent, strokeWidth)).join("")}
      ${replacesGeneratedFrame || input.layout.id !== "double-strip-4x6" ? "" : `<path d="M600 28 V1772" stroke="${input.accent}" stroke-width="3" stroke-dasharray="14 14" opacity="0.55" />`}
      ${replacesGeneratedFrame ? "" : overlayMarkup(input.overlayKind, input.layout, input.accent)}
      ${replacesGeneratedFrame ? "" : brandMarkup}
    </svg>
  `);

  const customOverlayLayer =
    input.customOverlayPath && input.customOverlayMode
      ? [
          {
            input: await renderCustomOverlay(
              await readFile(input.customOverlayPath),
              input.layout,
              input.customOverlayMode,
              input.frameTransform,
            ),
            top: 0,
            left: 0,
          },
        ]
      : [];

  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: input.background,
    },
  })
    .composite([...photos, { input: frame, top: 0, left: 0 }, ...customOverlayLayer])
    .withMetadata({ density: 300 })
    .png()
    .toFile(input.outputPath);
}

const runFfmpeg = (arguments_: string[]) =>
  new Promise<void>((resolvePromise, reject) => {
    const executable =
      process.env.WANDERBOOTH_FFMPEG_PATH ??
      ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].find((path) => existsSync(path)) ??
      "ffmpeg";
    const child = spawn(executable, arguments_, { stdio: ["ignore", "ignore", "pipe"] });
    let errors = "";
    child.stderr.on("data", (chunk) => {
      errors += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`ffmpeg exited with code ${code}: ${errors.slice(-800)}`));
    });
  });

async function createSlideshow(individualPaths: string[], outputPath: string) {
  const listPath = join(dirname(outputPath), "slideshow-inputs.txt");
  const quote = (path: string) => path.replaceAll("'", "'\\''");
  const lines = individualPaths.flatMap((path) => [`file '${quote(path)}'`, "duration 1.5"]);
  lines.push(`file '${quote(individualPaths.at(-1) ?? individualPaths[0])}'`);
  await writeFile(listPath, `${lines.join("\n")}\n`, "utf8");

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-vf",
    "scale=1200:900:force_original_aspect_ratio=decrease,pad=1200:900:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p",
    "-t",
    String(individualPaths.length * 1.5),
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

export async function buildDeliverables(
  state: BoothState,
  dataDirectory: string,
): Promise<Deliverable[]> {
  if (!state.sessionId) throw new Error("A session is required to build deliverables.");
  const design = getDesign(state.designId) ?? getDesign("wander-splash");
  const layout = resolveLayout(state.layoutId, state.customSlots);
  const overlay = getOverlay(state.overlayId, state.customOverlays);
  const validFrame =
    (state.frameMode === "color" &&
      Boolean(state.designId) &&
      Boolean(overlay && overlay.kind !== "custom")) ||
    (state.frameMode === "custom" && overlay?.kind === "custom");
  if (!design || !layout || !overlay || !validFrame) {
    throw new Error("A valid layout, frame, and overlay are required to build deliverables.");
  }

  const outputDirectory = state.activeEventId
    ? join(
        dataDirectory,
        "events",
        state.activeEventId,
        "sessions",
        state.sessionId,
        "deliverables",
      )
    : join(dataDirectory, "sessions", state.sessionId, "deliverables");
  await mkdir(outputDirectory, { recursive: true });

  const individualPaths: string[] = [];
  const capturePaths = state.captures.map((capture) =>
    mediaUrlToPath(dataDirectory, capture.mediaUrl),
  );
  for (const [index, capture] of state.captures.entries()) {
    const outputPath = join(outputDirectory, `photo-${capture.slot}.png`);
    await createBrandedIndividual({
      capturePath: capturePaths[index],
      outputPath,
      accent: design.accent,
      background: design.background,
      photoNumber: capture.slot,
    });
    individualPaths.push(outputPath);
  }

  const compositePath = join(outputDirectory, `wanderbooth-${layout.id}.png`);
  await createComposite({
    capturePaths,
    outputPath: compositePath,
    accent: design.accent,
    background: state.frameMode === "custom" ? "#fffaf2" : design.background,
    designName: design.name,
    layout,
    overlayKind: overlay.kind,
    overlayName: overlay.name,
    customOverlayPath:
      overlay.kind === "custom"
        ? mediaUrlToPath(dataDirectory, overlay.sourceMediaUrl ?? overlay.mediaUrl)
        : null,
    customOverlayMode: overlay.kind === "custom" ? overlay.importMode : null,
    frameTransform: state.frameTransform,
    holderTransforms: state.holderTransforms,
    photoTransforms: state.photoTransforms,
  });

  const deliverables: Deliverable[] = individualPaths.map((absolutePath, index) => ({
    kind: "individual",
    label: `Branded photo ${index + 1}`,
    mediaUrl: publicMediaUrl(dataDirectory, absolutePath),
    mimeType: "image/png",
  }));
  deliverables.push({
    kind: "strip",
    label: `Branded ${layout.name} (${layout.printSize.replace("x", "×")})`,
    mediaUrl: publicMediaUrl(dataDirectory, compositePath),
    mimeType: "image/png",
  });

  const slideshowPath = join(outputDirectory, "wanderbooth-slideshow.mp4");
  try {
    await createSlideshow(individualPaths, slideshowPath);
    deliverables.push({
      kind: "slideshow",
      label: "1.5-second looping slideshow",
      mediaUrl: publicMediaUrl(dataDirectory, slideshowPath),
      mimeType: "video/mp4",
    });
  } catch (error) {
    console.warn("Slideshow generation is unavailable:", error);
  }

  return deliverables;
}
