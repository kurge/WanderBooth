import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

// Mechanical print-size normalization only: never crop, stretch or redesign artwork.
const [sourceArgument, outputArgument] = process.argv.slice(2);
if (!sourceArgument || !outputArgument) {
  throw new Error("Usage: node scripts/standardize-template-artwork.mjs SOURCE NEW_OUTPUT_FOLDER");
}
const sourceDirectory = resolve(sourceArgument);
const outputDirectory = resolve(outputArgument);
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const formats = [
  { name: "2x6", width: 600, height: 1800 },
  { name: "4x6-portrait", width: 1200, height: 1800 },
  { name: "4x6-landscape", width: 1800, height: 1200 },
];
const filenames = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.png$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
assert.ok(filenames.length, "No PNG templates found.");

// Validate every input before creating output. Only exact matching aspect ratios are supported.
const inputs = [];
for (const name of filenames) {
  const source = await readFile(join(sourceDirectory, name));
  const metadata = await sharp(source).metadata();
  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  const format = formats.find((item) => width * item.height === height * item.width);
  assert.ok(format, `${name}: unsupported aspect ratio; adjust the design explicitly first.`);
  const stats = await sharp(source).stats();
  inputs.push({ name, source, metadata, format, opaque: stats.isOpaque });
}

// Refuse an existing destination, even if it is empty; originals are read-only.
await mkdir(outputDirectory);
const records = [];
for (const { name, source, metadata, format, opaque } of inputs) {
  const alreadyCorrect =
    metadata.width === format.width &&
    metadata.height === format.height &&
    metadata.density === 300 &&
    (!metadata.orientation || metadata.orientation === 1);
  const output = alreadyCorrect
    ? source
    : await sharp(source)
        .autoOrient()
        .resize(format.width, format.height, { fit: "inside", kernel: "lanczos3" })
        .withMetadata({ density: 300, orientation: 1 })
        .png()
        .toBuffer();
  const result = await sharp(output).metadata();
  assert.equal(result.width, format.width);
  assert.equal(result.height, format.height);
  assert.equal(result.density, 300);
  assert.equal(result.hasAlpha, metadata.hasAlpha, "Alpha channel must be preserved.");
  assert.equal((await sharp(output).stats()).isOpaque, opaque, "Transparency must be preserved.");
  const outputName = `${basename(name, ".png")}-${format.name}-300dpi.png`;
  await writeFile(join(outputDirectory, outputName), output, { flag: "wx" });
  assert.equal(
    hash(await readFile(join(sourceDirectory, name))),
    hash(source),
    "Original changed.",
  );
  records.push({
    source: name,
    output: outputName,
    action: alreadyCorrect ? "copied-byte-for-byte" : "proportional-resize",
    before: { width: metadata.width, height: metadata.height, dpi: metadata.density ?? null },
    after: { width: result.width, height: result.height, dpi: result.density },
    transparencyPreserved: true,
    sourceSha256: hash(source),
    outputSha256: hash(output),
  });
  console.log(`${name} → ${outputName} (${alreadyCorrect ? "unchanged copy" : "resized"})`);
}
await writeFile(
  join(outputDirectory, "manifest.json"),
  `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), files: records }, null, 2)}\n`,
  { flag: "wx" },
);
console.log(`Verified ${records.length} PNGs; originals unchanged. Output: ${outputDirectory}`);
