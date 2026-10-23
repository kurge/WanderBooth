// @vitest-environment node
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { CanonCamera } from "./canonCamera";
import { JpegStreamDecoder, type StartPreview } from "./gphotoPreview";

const jpeg = () =>
  sharp({ create: { width: 720, height: 480, channels: 3, background: "red" } })
    .jpeg()
    .toBuffer();

async function fixture(
  options: {
    detected?: string;
    invalid?: boolean;
    resumeFails?: boolean;
    captureFails?: boolean;
    previewClaims?: number;
    captureClaim?: boolean;
  } = {},
) {
  const frame = await jpeg();
  const events: string[] = [];
  let directory: string | undefined;
  let starts = 0;
  let captures = 0;
  const releaseUsb = vi.fn(async () => {});
  let previewError: (error: Error) => void = () => {};
  const startPreview: StartPreview = (_binary, _args, onFrame, onError) => {
    events.push("preview");
    starts++;
    previewError = onError;
    const ready = Promise.resolve().then(() => {
      if (starts <= (options.previewClaims ?? 0)) throw new Error("Could not claim the USB device");
      if (starts > 1 && options.resumeFails) throw new Error("USB disconnected");
      onFrame(frame);
    });
    return {
      ready,
      stop: async () => {
        events.push("stop");
      },
    };
  };
  const run = vi.fn(async (_binary: string, args: string[], cwd?: string) => {
    if (args.includes("--auto-detect"))
      return options.detected ?? "Canon EOS 60D                  usb:001,002\n";
    events.push("capture");
    captures++;
    directory = cwd;
    if (options.captureFails) throw new Error("PTP Device Busy");
    if (options.captureClaim && captures === 1) throw new Error("Could not claim the USB device");
    if (!cwd) throw new Error("Capture needs a private temporary folder.");
    await writeFile(join(cwd, "IMG_0001.JPG"), options.invalid ? Buffer.from("invalid") : frame);
    await writeFile(join(cwd, "IMG_0001.CR2"), "synthetic raw");
    return "";
  });
  const camera = new CanonCamera({
    platform: "darwin",
    resolveBinary: async () => "/test/gphoto2",
    run,
    startPreview,
    releaseUsb,
  });
  return {
    camera,
    run,
    releaseUsb,
    events,
    frame,
    directory: () => {
      if (!directory) throw new Error("No capture folder was created.");
      return directory;
    },
    failPreview: () => previewError(new Error("USB disconnected")),
  };
}

describe("Canon EOS USB controller", () => {
  it("releases the macOS importer once for an initial USB claim failure", async () => {
    const { camera, releaseUsb } = await fixture({ previewClaims: 1, captureClaim: true });
    await camera.connect();
    expect(releaseUsb).toHaveBeenCalledTimes(1);
    await camera.capture();
    expect(releaseUsb).toHaveBeenCalledTimes(2);
    expect(await camera.status()).toMatchObject({ ready: true });
    await camera.disconnect();
    const repeated = await fixture({ previewClaims: 5 });
    await expect(repeated.camera.connect()).rejects.toThrow("USB connection is busy");
    expect(repeated.releaseUsb).toHaveBeenCalledTimes(1);
    await repeated.camera.disconnect();
  });
  it("requires a test still, releases preview before shutter and resumes before declaring ready", async () => {
    const { camera, run, events, directory } = await fixture();
    await camera.connect();
    expect(await camera.status()).toMatchObject({
      connected: true,
      previewing: true,
      ready: false,
    });
    const photo = await camera.capture();
    expect(photo.filename).toBe("IMG_0001.JPG");
    expect(events).toEqual(["preview", "stop", "capture", "preview"]);
    expect(await camera.status()).toMatchObject({
      ready: true,
      lastPhoto: { width: 720, height: 480 },
    });
    const args = run.mock.calls[1][1];
    expect(args).toEqual(
      expect.arrayContaining([
        "--camera",
        "Canon EOS 60D",
        "--port",
        "usb:001,002",
        "--keep",
        "--keep-raw",
        "capturetarget=Memory card",
        "viewfinder=0",
      ]),
    );
    await expect(access(directory())).rejects.toThrow();
    await camera.disconnect();
    expect(await camera.status()).toMatchObject({
      ready: false,
      connected: false,
      previewing: false,
      verifiedAt: null,
    });
  });

  it("never selects a different camera or guesses between two 60Ds", async () => {
    for (const detected of [
      "Fujifilm X-M5    usb:001,003\n",
      "Canon EOS 60D    usb:001,002\nCanon EOS 60D    usb:001,003\n",
    ]) {
      const { camera, events } = await fixture({ detected });
      await expect(camera.connect()).rejects.toThrow(/No Canon|More than one/);
      expect(events).toEqual([]);
      expect(await camera.status()).toMatchObject({ ready: false, connected: false });
    }
  });

  it("rejects invalid JPEGs, cleans temporary media and offers preview again", async () => {
    const { camera, directory, events } = await fixture({ invalid: true });
    await camera.connect();
    await expect(camera.capture()).rejects.toThrow("usable JPEG");
    expect(await camera.status()).toMatchObject({ ready: false, busy: false, capturing: false });
    expect(events.at(-1)).toBe("preview");
    await expect(access(directory())).rejects.toThrow();
    await camera.disconnect();
  });

  it("preserves a successful still when preview recovery fails", async () => {
    const { camera } = await fixture({ resumeFails: true });
    await camera.connect();
    await expect(camera.capture()).resolves.toMatchObject({ filename: "IMG_0001.JPG" });
    expect(await camera.status()).toMatchObject({
      ready: false,
      previewing: false,
      verifiedAt: null,
    });
    await camera.disconnect();
  });

  it("invalidates readiness on a preview disconnect and gives actionable busy errors", async () => {
    const { camera, failPreview } = await fixture();
    await camera.connect();
    await camera.capture();
    failPreview();
    expect(await camera.status()).toMatchObject({
      ready: false,
      previewing: false,
      verifiedAt: null,
    });
    await camera.disconnect();
    const busy = await fixture({ captureFails: true });
    await busy.camera.connect();
    await expect(busy.camera.capture()).rejects.toThrow("Quit EOS Utility");
    expect(busy.events.filter((event) => event === "capture")).toHaveLength(1);
    expect(busy.releaseUsb).not.toHaveBeenCalled();
    expect(await busy.camera.status()).toMatchObject({ ready: false, capturing: false });
    await busy.camera.disconnect();
  });

  it("rejects overlapping commands and does not enable unsupported platforms", async () => {
    const { camera } = await fixture();
    const connecting = camera.connect();
    await expect(camera.capture()).rejects.toThrow("busy");
    await connecting;
    await camera.shutdown();
    await expect(camera.connect()).rejects.toThrow("shutting down");
    const windows = new CanonCamera({
      platform: "win32",
      resolveBinary: async () => "/test/gphoto2",
    });
    expect(await windows.status()).toMatchObject({ available: false, ready: false });
    await expect(windows.connect()).rejects.toThrow("macOS only");
    const missing = new CanonCamera({ platform: "darwin", resolveBinary: async () => null });
    await expect(missing.connect()).rejects.toThrow("Install gPhoto2");
  });
});

describe("gPhoto live JPEG stream", () => {
  it("reassembles fragmented frames and ignores an embedded thumbnail's end marker", async () => {
    const frame = await jpeg();
    const thumbnailSegment = Buffer.from([0xff, 0xe1, 0, 8, 0xff, 0xd8, 0, 0, 0xff, 0xd9]);
    const withThumbnail = Buffer.concat([
      frame.subarray(0, 2),
      thumbnailSegment,
      frame.subarray(2),
    ]);
    const stream = Buffer.concat([Buffer.from("noise"), withThumbnail, frame]);
    const parser = new JpegStreamDecoder();
    const frames: Buffer[] = [];
    for (let index = 0; index < stream.length; index += 7)
      frames.push(...parser.push(stream.subarray(index, index + 7)));
    expect(frames).toEqual([withThumbnail, frame]);
  });

  it("bounds memory for a malformed camera stream", () => {
    const parser = new JpegStreamDecoder();
    expect(() => parser.push(Buffer.alloc(9 * 1024 * 1024))).toThrow("size limit");
  });
});
