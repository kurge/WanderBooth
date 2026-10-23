// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { createBrandedIndividual } from "./deliverables";
import { framePhoto, saveSessionPhoto } from "./photoFraming";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
const temporary = async () => {
  const path = await mkdtemp(join(tmpdir(), "wanderbooth-framing-"));
  directories.push(path);
  return path;
};
const sourceImage = () =>
  sharp(
    Buffer.from(
      '<svg width="1600" height="900"><rect width="1600" height="900" fill="blue"/><rect x="200" width="600" height="900" fill="red"/><rect x="800" width="600" height="900" fill="lime"/></svg>',
    ),
  )
    .jpeg()
    .toBuffer();
const pixel = async (source: Buffer | string, left: number, top: number) => {
  const data = await sharp(source)
    .extract({ left, top, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  return [...data];
};

describe("camera framing and local originals", () => {
  it("crops the sides without shrinking or mirroring the saved image", async () => {
    const output = await framePhoto(await sourceImage());
    expect(await sharp(output).metadata()).toMatchObject({ width: 1200, height: 900 });
    expect((await pixel(output, 10, 400))[0]).toBeGreaterThan(240);
    expect((await pixel(output, 1190, 400))[1]).toBeGreaterThan(240);
  });
  it("uses the same crop for a reduced, mirrored preview", async () => {
    const output = await framePhoto(await sourceImage(), true);
    expect(await sharp(output).metadata()).toMatchObject({ width: 960, height: 720 });
    expect((await pixel(output, 10, 300))[1]).toBeGreaterThan(240);
    expect((await pixel(output, 950, 300))[0]).toBeGreaterThan(240);
  });
  it("applies EXIF orientation before computing the crop", async () => {
    const source = await sharp({
      create: { width: 900, height: 1600, channels: 3, background: "red" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const output = await framePhoto(source);
    expect(await sharp(output).metadata()).toMatchObject({ width: 1200, height: 900 });
    expect((await sharp(output).metadata()).orientation).toBeUndefined();
  });
  it("does not enlarge small previews", async () => {
    const source = await sharp({
      create: { width: 720, height: 480, channels: 3, background: "red" },
    })
      .jpeg()
      .toBuffer();
    expect(await sharp(await framePhoto(source, true)).metadata()).toMatchObject({
      width: 640,
      height: 480,
    });
  });
  it("keeps byte-identical originals, retakes and repeated attempts in the session folder", async () => {
    const dataDirectory = await temporary();
    const sessionRoot = join(dataDirectory, "events", "test-event", "sessions", "test-session");
    const source = await sourceImage();
    const input = { dataDirectory, sessionRoot, source, slot: 1, revision: 1 };
    const first = await saveSessionPhoto(input);
    const retry = await saveSessionPhoto(input);
    const retake = await saveSessionPhoto({ ...input, revision: 2 });
    for (const saved of [first, retry, retake]) {
      const original = join(dataDirectory, saved.originalMediaUrl.slice("/media/".length));
      expect(await readFile(original)).toEqual(source);
      expect(await sharp(saved.absolutePath).metadata()).toMatchObject({
        width: 1200,
        height: 900,
      });
      expect(saved.originalMediaUrl).toContain("/test-session/originals/photo-1-r");
    }
    expect(first.originalMediaUrl).not.toBe(retry.originalMediaUrl);
    expect(await readdir(join(sessionRoot, "originals"))).toHaveLength(3);
  });
  it("rejects corrupt input before creating capture or backup files", async () => {
    const dataDirectory = await temporary();
    await expect(
      saveSessionPhoto({
        dataDirectory,
        sessionRoot: dataDirectory,
        source: Buffer.from("not an image"),
        slot: 1,
        revision: 1,
      }),
    ).rejects.toThrow();
    expect(await readdir(dataDirectory)).toEqual([]);
  });
  it("preserves 4:3 scene framing when adding branding to individual downloads", async () => {
    const root = await temporary();
    const source = await sharp(
      Buffer.from(
        '<svg width="1200" height="900"><rect width="1200" height="900" fill="blue"/><rect width="1200" height="30" fill="red"/><rect y="760" width="1200" height="30" fill="lime"/></svg>',
      ),
    )
      .png()
      .toBuffer();
    const photo = await saveSessionPhoto({
      source,
      dataDirectory: root,
      sessionRoot: root,
      slot: 1,
      revision: 1,
    });
    const outputPath = join(root, "branded.png");
    await createBrandedIndividual({
      capturePath: photo.absolutePath,
      outputPath,
      accent: "#000000",
      background: "#ffffff",
      photoNumber: 1,
    });
    expect(await sharp(outputPath).metadata()).toMatchObject({ width: 1200, height: 900 });
    expect((await pixel(outputPath, 600, 10))[0]).toBeGreaterThan(240);
    expect((await pixel(outputPath, 600, 775))[1]).toBeGreaterThan(240);
  });
});
