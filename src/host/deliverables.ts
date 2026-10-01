import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import sharp from "sharp";

import { getDesign } from "../shared/catalog.js";
import type { BoothState, Deliverable } from "../shared/session.js";

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

async function createStrip(input: {
  individualPaths: string[];
  outputPath: string;
  accent: string;
  background: string;
  designName: string;
}) {
  const width = 600;
  const height = 1800;
  const frameWidth = 540;
  const frameHeight = 420;
  const topPositions = [120, 570, 1020];
  const photos = await Promise.all(
    input.individualPaths
      .slice(0, 3)
      .map((photoPath) =>
        sharp(photoPath).resize(frameWidth, frameHeight, { fit: "cover" }).png().toBuffer(),
      ),
  );
  const brand = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="30" fill="${input.background}" />
      <circle cx="66" cy="60" r="28" fill="${input.accent}" />
      <text x="108" y="69" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="800" fill="${input.accent}">WanderBooth</text>
      <path d="M40 1570 C160 1500 230 1650 350 1585 C455 1528 520 1585 570 1660 L570 1770 L30 1770 Z" fill="${input.accent}" opacity="0.16" />
      <text x="300" y="1640" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${input.accent}">${escapeXml(input.designName)}</text>
      <text x="300" y="1690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="${input.accent}">made for wanderers</text>
      <text x="300" y="1740" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${input.accent}">Wander Press PH</text>
    </svg>
  `);

  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: input.background,
    },
  })
    .composite([
      { input: brand, top: 0, left: 0 },
      ...photos.map((photo, index) => ({ input: photo, top: topPositions[index], left: 30 })),
    ])
    .withMetadata({ density: 300 })
    .png()
    .toFile(input.outputPath);
}

const runFfmpeg = (arguments_: string[]) =>
  new Promise<void>((resolvePromise, reject) => {
    const child = spawn("ffmpeg", arguments_, { stdio: ["ignore", "ignore", "pipe"] });
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
  const design = getDesign(state.designId);
  if (!design) throw new Error("A valid design is required to build deliverables.");

  const outputDirectory = join(dataDirectory, "sessions", state.sessionId, "deliverables");
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

  const stripPath = join(outputDirectory, "wanderbooth-strip-2x6.png");
  await createStrip({
    individualPaths: capturePaths,
    outputPath: stripPath,
    accent: design.accent,
    background: design.background,
    designName: design.name,
  });

  const deliverables: Deliverable[] = individualPaths.map((absolutePath, index) => ({
    kind: "individual",
    label: `Branded photo ${index + 1}`,
    mediaUrl: publicMediaUrl(dataDirectory, absolutePath),
    mimeType: "image/png",
  }));
  deliverables.push({
    kind: "strip",
    label: "Branded 2×6 strip",
    mediaUrl: publicMediaUrl(dataDirectory, stripPath),
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
