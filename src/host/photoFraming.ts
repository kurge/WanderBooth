import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import sharp from "sharp";

import { PHOTO_PREVIEW_WIDTH, photoCrop } from "../shared/photoFraming.js";

export async function framePhoto(source: Buffer, preview = false) {
  const metadata = await sharp(source).metadata();
  const crop = photoCrop(metadata.autoOrient.width, metadata.autoOrient.height);
  let pipeline = sharp(source).autoOrient().extract(crop);
  if (preview) {
    pipeline = pipeline.flop().resize({ width: Math.min(crop.width, PHOTO_PREVIEW_WIDTH) });
  }
  return pipeline.jpeg({ quality: preview ? 65 : 95 }).toBuffer();
}

/** Save an untouched camera file separately from the session's unmirrored 4:3 copy. */
export async function saveSessionPhoto(input: {
  source: Buffer;
  dataDirectory: string;
  sessionRoot: string;
  slot: number;
  revision: number;
}) {
  const metadata = await sharp(input.source).metadata();
  if (metadata.format !== "jpeg" && metadata.format !== "png") {
    throw new Error("Camera captures must be JPEG or PNG images.");
  }
  const cropped = await framePhoto(input.source);
  // Unique, exclusive writes also preserve an earlier attempt if persistence fails and is retried.
  const name = `photo-${input.slot}-r${input.revision}-${randomUUID()}`;
  const originalPath = resolve(
    input.sessionRoot,
    "originals",
    `${name}.${metadata.format === "jpeg" ? "jpg" : "png"}`,
  );
  const absolutePath = resolve(input.sessionRoot, "captures", `${name}.jpg`);
  await mkdir(resolve(input.sessionRoot, "originals"), { recursive: true });
  await mkdir(resolve(input.sessionRoot, "captures"), { recursive: true });
  await writeFile(originalPath, input.source, { flag: "wx" });
  await writeFile(absolutePath, cropped, { flag: "wx" });
  const mediaUrl = (path: string) =>
    `/media/${relative(input.dataDirectory, path).split("\\").join("/")}`;
  return {
    absolutePath,
    mediaUrl: mediaUrl(absolutePath),
    originalMediaUrl: mediaUrl(originalPath),
  };
}
