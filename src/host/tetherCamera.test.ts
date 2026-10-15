// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { TetherCameraBridge } from "./tetherCamera";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const makeTestJpeg = (color: { r: number; g: number; b: number }) =>
  sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: color,
    },
  })
    .jpeg()
    .toBuffer();

describe("Fujifilm tether folder bridge", () => {
  it("ignores existing photos and imports only a newly completed JPEG", async () => {
    const root = await mkdtemp(join(tmpdir(), "wanderbooth-tether-"));
    temporaryDirectories.push(root);
    const inbox = join(root, "inbox");
    await mkdir(inbox);
    await writeFile(join(inbox, "old-photo.jpg"), await makeTestJpeg({ r: 10, g: 20, b: 30 }));

    const bridge = new TetherCameraBridge(join(root, "runtime"));
    await bridge.configure(inbox);
    const baseline = await bridge.snapshot();
    const waiting = bridge.waitForNewJpeg(baseline, 2_000);
    await delay(60);
    await writeFile(join(inbox, "new-photo.JPG"), await makeTestJpeg({ r: 240, g: 220, b: 20 }));

    const imported = await waiting;
    expect(imported.filename).toBe("new-photo.JPG");
    expect(imported.buffer.length).toBeGreaterThan(100);
  });

  it("persists the selected folder and verification time locally", async () => {
    const root = await mkdtemp(join(tmpdir(), "wanderbooth-tether-config-"));
    temporaryDirectories.push(root);
    const inbox = join(root, "inbox");
    const runtime = join(root, "runtime");
    await mkdir(inbox);

    const first = new TetherCameraBridge(runtime);
    await first.configure(inbox);
    await first.markVerified("DSCF0001.JPG");

    const restored = new TetherCameraBridge(runtime);
    await restored.load();
    await expect(restored.status()).resolves.toMatchObject({
      configured: true,
      downloadDirectory: inbox,
      ready: true,
    });
    expect((await restored.status()).verifiedAt).not.toBeNull();
  });

  it("waits when a JPEG filename appears before the file is complete", async () => {
    const root = await mkdtemp(join(tmpdir(), "wanderbooth-tether-partial-"));
    temporaryDirectories.push(root);
    const inbox = join(root, "inbox");
    await mkdir(inbox);

    const bridge = new TetherCameraBridge(join(root, "runtime"));
    await bridge.configure(inbox);
    const baseline = await bridge.snapshot();
    const jpeg = await makeTestJpeg({ r: 90, g: 120, b: 180 });
    const path = join(inbox, "slow-transfer.jpg");
    const waiting = bridge.waitForNewJpeg(baseline, 2_500);
    await writeFile(path, jpeg.subarray(0, Math.floor(jpeg.length / 2)));
    await delay(650);
    await writeFile(path, jpeg);

    await expect(waiting).resolves.toMatchObject({ filename: "slow-transfer.jpg" });
  });

  it("fails rather than reusing an old customer photo", async () => {
    const root = await mkdtemp(join(tmpdir(), "wanderbooth-tether-timeout-"));
    temporaryDirectories.push(root);
    const inbox = join(root, "inbox");
    await mkdir(inbox);
    await writeFile(join(inbox, "existing.jpg"), await makeTestJpeg({ r: 1, g: 2, b: 3 }));

    const bridge = new TetherCameraBridge(join(root, "runtime"));
    await bridge.configure(inbox);
    const baseline = await bridge.snapshot();

    await expect(bridge.waitForNewJpeg(baseline, 300)).rejects.toThrow(
      "No new complete JPEG arrived",
    );
  });
});
