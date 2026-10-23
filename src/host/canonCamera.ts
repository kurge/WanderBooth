import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

import type { CanonCameraStatus } from "../shared/canonCamera.js";
import { resolveGPhotoBinary } from "./directXm5Camera.js";
import { type PreviewProcess, type StartPreview, startGPhotoPreview } from "./gphotoPreview.js";

type RunCommand = (
  binary: string,
  args: string[],
  cwd?: string,
  signal?: AbortSignal,
) => Promise<string>;
const exec = promisify(execFile);
const usbClaimConflict = (error: unknown) =>
  /could not claim/i.test(
    error instanceof Error
      ? `${error.message}\n${"stderr" in error ? String(error.stderr) : ""}`
      : "",
  );
const releaseMacImporter = async () => {
  // macOS may auto-claim a camera even when no import window is open. Release
  // only that helper once per claim failure; never terminate user-facing apps.
  // The helper ignores SIGTERM on the pilot Mac, so it needs a restart.
  await exec("/usr/bin/killall", ["-KILL", "ptpcamerad"], { timeout: 2_000 }).catch(
    () => undefined,
  );
};
const runCommand: RunCommand = async (binary, args, cwd, signal) => {
  const result = await exec(binary, args, {
    cwd,
    signal,
    timeout: 60_000,
    killSignal: "SIGKILL",
    maxBuffer: 1024 * 1024,
    env: { ...process.env, LANG: "C", LC_ALL: "C" },
  });
  return result.stdout;
};

export const canonCaptureArguments = [
  "--set-config",
  "viewfinder=0",
  "--set-config-value",
  "capturetarget=Memory card",
  "--keep",
  "--keep-raw",
  "--force-overwrite",
  "--capture-image-and-download",
];

const errorMessage = (error: unknown) => {
  const details =
    error instanceof Error
      ? `${error.message}\n${"stderr" in error ? String(error.stderr) : ""}`
      : "";
  if (/claim|busy|I\/O in progress/i.test(details)) {
    return "The Canon USB connection is busy. Quit EOS Utility, EOS Webcam Utility, Photos and Image Capture, then reconnect the camera.";
  }
  if (/focus/i.test(details))
    return "Canon could not focus. Check the lighting and focus point, or pre-focus the lens and switch it to MF, then retry.";
  if (
    /timed out|killed/i.test(details) ||
    (error instanceof Error && "killed" in error && error.killed)
  )
    return "Canon did not respond in time. Check power and the USB data cable, then reconnect in Camera source.";
  if (/No camera found|Could not detect/i.test(details))
    return "The Canon is no longer connected. Check power and the USB data cable, then reconnect in Camera source.";
  if (/JPEG/i.test(details))
    return "Canon did not return a usable JPEG. Set image quality to JPEG or RAW+JPEG, then take another test photo.";
  if (/No Canon|More than one|Install gPhoto2|macOS|Connect the Canon/i.test(details))
    return details.trim();
  return "Canon disconnected or could not complete the operation. Check the USB cable, a writable SD card and still-photo mode, then reconnect. Close other camera apps.";
};

export class CanonCamera {
  private readonly resolveBinary: () => Promise<string | null>;
  private readonly run: RunCommand;
  private readonly startPreviewProcess: StartPreview;
  private readonly platform: string;
  private readonly onFrame: (frame: Buffer) => void;
  private readonly releaseUsb: () => Promise<void>;
  private binary: string | null = null;
  private device: { model: string; port: string } | null = null;
  private preview: PreviewProcess | null = null;
  private previewGeneration = 0;
  private lastFrameAt = 0;
  private processingFrame = false;
  private busy = false;
  private capturing = false;
  private verifiedAt: string | null = null;
  private lastError: string | null = null;
  private lastPhoto: CanonCameraStatus["lastPhoto"] = null;
  private readonly abort = new AbortController();
  private closing = false;
  private operation: Promise<unknown> | null = null;

  constructor(
    dependencies: {
      resolveBinary?: () => Promise<string | null>;
      run?: RunCommand;
      startPreview?: StartPreview;
      platform?: string;
      onFrame?: (frame: Buffer) => void;
      releaseUsb?: () => Promise<void>;
    } = {},
  ) {
    this.resolveBinary = dependencies.resolveBinary ?? resolveGPhotoBinary;
    this.run =
      dependencies.run ?? ((binary, args, cwd) => runCommand(binary, args, cwd, this.abort.signal));
    this.startPreviewProcess = dependencies.startPreview ?? startGPhotoPreview;
    this.platform = dependencies.platform ?? process.platform;
    this.onFrame = dependencies.onFrame ?? (() => {});
    this.releaseUsb = dependencies.releaseUsb ?? releaseMacImporter;
  }

  async status(): Promise<CanonCameraStatus> {
    const available = this.platform === "darwin" && Boolean(await this.resolveBinary());
    const previewing = Boolean(this.preview) && Date.now() - this.lastFrameAt < 5_000;
    return {
      available,
      connected: Boolean(this.device),
      model: this.device?.model ?? null,
      busy: this.busy,
      capturing: this.capturing,
      previewing,
      ready:
        available &&
        Boolean(this.device && this.verifiedAt) &&
        previewing &&
        !this.busy &&
        !this.lastError,
      verifiedAt: this.verifiedAt,
      lastPhoto: this.lastPhoto,
      lastError:
        this.platform !== "darwin"
          ? "Canon USB support is currently available on macOS only."
          : !available
            ? "Install gPhoto2 on this Mac before using Canon USB capture."
            : this.lastError,
    };
  }

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.closing) throw new Error("Canon controller is shutting down.");
    if (this.busy) throw new Error("Canon is busy. Wait for the current operation to finish.");
    this.busy = true;
    this.operation = action();
    try {
      return (await this.operation) as T;
    } catch (error) {
      this.lastError = errorMessage(error);
      this.verifiedAt = null;
      throw new Error(this.lastError);
    } finally {
      this.busy = false;
      this.operation = null;
    }
  }

  private deviceArgs(): string[] {
    if (!this.device || !this.binary) throw new Error("Connect the Canon in Camera source first.");
    return ["--camera", this.device.model, "--port", this.device.port];
  }

  async connect(): Promise<void> {
    return this.exclusive(async () => {
      await this.stopPreview();
      this.device = null;
      this.verifiedAt = null;
      this.lastError = null;
      if (this.platform !== "darwin")
        throw new Error("Canon USB support is currently available on macOS only.");
      this.binary = await this.resolveBinary();
      if (!this.binary)
        throw new Error("Install gPhoto2 on this Mac before using Canon USB capture.");
      const detected = await this.run(this.binary, ["--auto-detect"]);
      const cameras = [...detected.matchAll(/^(Canon EOS 60D)\s+(usb:\d+,\d+)\s*$/gm)];
      if (cameras.length === 0)
        throw new Error(
          "No Canon EOS 60D was detected. Connect its USB data cable and turn the camera on.",
        );
      if (cameras.length > 1)
        throw new Error(
          "More than one Canon EOS 60D is connected. Leave only the booth camera connected.",
        );
      this.device = { model: cameras[0][1], port: cameras[0][2] };
      await this.startPreview();
    });
  }

  private async startPreview(retryClaim = true): Promise<void> {
    const args = this.deviceArgs();
    const binary = this.binary;
    if (!binary) throw new Error("Connect the Canon in Camera source first.");
    const generation = ++this.previewGeneration;
    this.lastFrameAt = 0;
    const preview = this.startPreviewProcess(
      binary,
      [...args, "--capture-movie", "--stdout"],
      (frame) => {
        if (this.processingFrame || generation !== this.previewGeneration) return;
        this.processingFrame = true;
        void sharp(frame)
          .autoOrient()
          .flop()
          .resize({ width: 960, withoutEnlargement: true })
          .jpeg({ quality: 65 })
          .toBuffer()
          .then((jpeg) => {
            if (generation !== this.previewGeneration) return;
            this.lastFrameAt = Date.now();
            this.onFrame(jpeg);
          })
          .catch(() => {
            if (generation === this.previewGeneration) {
              this.lastError = "Canon returned an unreadable live preview. Reconnect the camera.";
              this.lastFrameAt = 0;
            }
          })
          .finally(() => {
            this.processingFrame = false;
          });
      },
      (error) => {
        if (generation !== this.previewGeneration) return;
        ++this.previewGeneration;
        this.lastError = errorMessage(error);
        this.verifiedAt = null;
        this.lastFrameAt = 0;
      },
    );
    this.preview = preview;
    try {
      await preview.ready;
      // Wait for the first decoded/mirrored frame, not only bytes from USB.
      const deadline = Date.now() + 3_000;
      while (!this.lastFrameAt && !this.lastError && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      if (!this.lastFrameAt) throw new Error("Canon live preview timed out.");
    } catch (error) {
      await this.stopPreview();
      if (retryClaim && !this.closing && usbClaimConflict(error)) {
        await this.releaseUsb();
        this.lastError = null;
        await this.startPreview(false);
        return;
      }
      throw error;
    }
  }

  private async stopPreview(): Promise<void> {
    ++this.previewGeneration;
    this.lastFrameAt = 0;
    const preview = this.preview;
    this.preview = null;
    await preview?.stop();
  }

  async disconnect(): Promise<void> {
    return this.exclusive(async () => {
      await this.stopPreview();
      this.device = null;
      this.verifiedAt = null;
      this.lastError = null;
    });
  }

  async shutdown(): Promise<void> {
    this.closing = true;
    this.abort.abort();
    await this.stopPreview();
    await this.operation?.catch(() => undefined);
  }

  async capture(): Promise<{ buffer: Buffer; filename: string }> {
    return this.exclusive(async () => {
      const args = this.deviceArgs();
      const binary = this.binary;
      if (!binary) throw new Error("Connect the Canon in Camera source first.");
      const resume = Boolean(this.preview);
      this.capturing = true;
      this.lastError = null;
      let directory: string | null = null;
      try {
        await this.stopPreview();
        directory = await mkdtemp(join(tmpdir(), "wanderbooth-canon-"));
        try {
          await this.run(binary, [...args, ...canonCaptureArguments], directory);
        } catch (error) {
          // Retry only an initial USB-claim failure. A shutter/transfer failure
          // may already have taken a photo and must never trigger a second shot.
          if (!usbClaimConflict(error) || this.closing) throw error;
          await this.releaseUsb();
          await this.run(binary, [...args, ...canonCaptureArguments], directory);
        }
        const files = await readdir(directory);
        const filename = files.find((file) => /\.jpe?g$/i.test(file));
        if (!filename) throw new Error("Canon did not return a JPEG.");
        const buffer = await readFile(join(directory, filename));
        const metadata = await sharp(buffer)
          .metadata()
          .catch(() => null);
        if (metadata?.format !== "jpeg" || !metadata.width || !metadata.height)
          throw new Error("Invalid Canon JPEG.");
        this.lastPhoto = { filename, width: metadata.width, height: metadata.height };
        this.verifiedAt = new Date().toISOString();
        return { buffer, filename };
      } finally {
        this.capturing = false;
        if (directory) await rm(directory, { recursive: true, force: true });
        if (resume && !this.closing) {
          // A saved photo must survive a preview-resume failure. Readiness blocks
          // the next shot until staff reconnects; never fall back to a webcam.
          await this.startPreview().catch((error) => {
            this.lastError = errorMessage(error);
            this.verifiedAt = null;
          });
        }
      }
    });
  }
}
