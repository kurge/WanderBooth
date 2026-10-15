// @vitest-environment node

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { DirectXm5Camera, directXm5CaptureArguments } from "./directXm5Camera";

describe("direct Fujifilm X-M5 capture", () => {
  it("keeps camera files and returns the downloaded full-resolution JPEG", async () => {
    let receivedArguments: string[] = [];
    const camera = new DirectXm5Camera({
      resolveBinary: async () => "/test/gphoto2",
      runCapture: async (_binaryPath, directory, args) => {
        receivedArguments = args;
        const jpeg = await sharp({
          create: {
            width: 6240,
            height: 4160,
            channels: 3,
            background: { r: 30, g: 80, b: 120 },
          },
        })
          .jpeg()
          .toBuffer();
        await writeFile(join(directory, "DSCF0042.jpg"), jpeg);
        await writeFile(join(directory, "DSCF0041.raf"), "test raw placeholder");
      },
    });

    const photo = await camera.capture();
    expect(photo.filename).toBe("DSCF0042.jpg");
    await expect(sharp(photo.buffer).metadata()).resolves.toMatchObject({
      format: "jpeg",
      width: 6240,
      height: 4160,
    });
    expect(receivedArguments).toEqual(directXm5CaptureArguments);
    expect(receivedArguments).toContain("--keep");
    expect(receivedArguments).toContain("--keep-raw");
    await expect(camera.status()).resolves.toMatchObject({
      available: true,
      ready: true,
      lastFileName: "DSCF0042.jpg",
    });
  });

  it("stays unavailable until gPhoto2 is installed", async () => {
    const camera = new DirectXm5Camera({ resolveBinary: async () => null });

    await expect(camera.status()).resolves.toMatchObject({ available: false, ready: false });
    await expect(camera.capture()).rejects.toThrow("Install gPhoto2");
  });

  it("rejects a capture that does not produce a valid JPEG", async () => {
    const camera = new DirectXm5Camera({
      resolveBinary: async () => "/test/gphoto2",
      runCapture: async (_binaryPath, directory) => {
        await writeFile(join(directory, "DSCF0042.jpg"), "not a photo");
      },
    });

    await expect(camera.capture()).rejects.toThrow("X-M5 could not take the photo");
    await expect(camera.status()).resolves.toMatchObject({ ready: false });
  });
});
