import { spawn } from "node:child_process";
import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

import sharp from "sharp";

export type DirectXm5Status = {
  available: boolean;
  capturing: boolean;
  lastError: string | null;
  lastFileName: string | null;
  ready: boolean;
  verifiedAt: string | null;
};

export type DirectXm5Photo = {
  buffer: Buffer;
  filename: string;
};

type CaptureRunner = (binaryPath: string, directory: string, args: string[]) => Promise<void>;

type DirectXm5Dependencies = {
  resolveBinary?: () => Promise<string | null>;
  runCapture?: CaptureRunner;
};

export const directXm5CaptureArguments = [
  "--keep",
  "--keep-raw",
  "--force-overwrite",
  "--capture-image-and-download",
];

const jpegPattern = /\.jpe?g$/i;

const execute = (
  file: string,
  args: string[],
  options: { cwd?: string; timeoutMilliseconds?: number } = {},
) =>
  new Promise<{ stderr: string; stdout: string }>((resolvePromise, reject) => {
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: { ...process.env, LANG: "C" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMilliseconds ?? 60_000);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0 && !timedOut) {
        resolvePromise(result);
        return;
      }
      const error = new Error(timedOut ? "Camera capture timed out." : "Camera capture failed.");
      Object.assign(error, result);
      reject(error);
    });
  });

const stopMacCameraImporter = async () => {
  if (process.platform !== "darwin") return;
  await execute("/usr/bin/killall", ["-9", "ptpcamerad"], { timeoutMilliseconds: 2_000 }).catch(
    () => undefined,
  );
};

const runGPhotoCapture: CaptureRunner = async (binaryPath, directory, args) => {
  await stopMacCameraImporter();
  const importerTimer =
    process.platform === "darwin" ? setInterval(() => void stopMacCameraImporter(), 75) : null;
  importerTimer?.unref();
  try {
    await execute(binaryPath, args, { cwd: directory, timeoutMilliseconds: 60_000 });
  } finally {
    if (importerTimer) clearInterval(importerTimer);
  }
};

export const resolveGPhotoBinary = async () => {
  const candidates = [
    process.env.WANDERBOOTH_GPHOTO2_PATH,
    "/opt/homebrew/bin/gphoto2",
    "/usr/local/bin/gphoto2",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (!isAbsolute(candidate)) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next known installation path.
    }
  }
  return null;
};

const cameraErrorMessage = (error: unknown) => {
  const details = [
    error instanceof Error ? error.message : "",
    typeof error === "object" && error && "stderr" in error ? String(error.stderr) : "",
    typeof error === "object" && error && "stdout" in error ? String(error.stdout) : "",
  ].join("\n");

  if (/Could not claim|PTP.*busy|I\/O in progress/i.test(details)) {
    return "The X-M5 USB connection is busy. Fully quit Fujifilm Tether App, reconnect the camera, and test again.";
  }
  if (/No camera found|Could not detect|No camera/i.test(details)) {
    return "No X-M5 was detected. Check USB Tether Shooting Auto, the data cable, and camera power.";
  }
  if (/timed out/i.test(details)) {
    return "The X-M5 did not finish the photo within 60 seconds. Check the cable and camera, then retry.";
  }
  return "The X-M5 could not take the photo. Check that Fujifilm Tether App is closed and the camera is in USB Tether Shooting Auto.";
};

export class DirectXm5Camera {
  private readonly resolveBinary: () => Promise<string | null>;
  private readonly runCapture: CaptureRunner;
  private capturing = false;
  private lastError: string | null = null;
  private lastFileName: string | null = null;
  private verifiedAt: string | null = null;

  constructor(dependencies: DirectXm5Dependencies = {}) {
    this.resolveBinary = dependencies.resolveBinary ?? resolveGPhotoBinary;
    this.runCapture = dependencies.runCapture ?? runGPhotoCapture;
  }

  async status(): Promise<DirectXm5Status> {
    const available = Boolean(await this.resolveBinary());
    return {
      available,
      capturing: this.capturing,
      lastError: available
        ? this.lastError
        : "Install gPhoto2 on this Mac before using automatic X-M5 capture.",
      lastFileName: this.lastFileName,
      ready: available && Boolean(this.verifiedAt) && !this.capturing && !this.lastError,
      verifiedAt: this.verifiedAt,
    };
  }

  async capture(): Promise<DirectXm5Photo> {
    if (this.capturing) throw new Error("The X-M5 is already taking a photo.");
    const binaryPath = await this.resolveBinary();
    if (!binaryPath) {
      throw new Error("Install gPhoto2 on this Mac before using automatic X-M5 capture.");
    }

    this.capturing = true;
    this.lastError = null;
    const directory = await mkdtemp(join(tmpdir(), "wanderbooth-xm5-capture-"));
    try {
      await this.runCapture(binaryPath, directory, directXm5CaptureArguments);
      const files = await readdir(directory);
      const filename = files.find((file) => jpegPattern.test(file));
      if (!filename) throw new Error("The X-M5 did not return a JPEG.");
      const buffer = await readFile(join(directory, filename));
      const metadata = await sharp(buffer).metadata();
      if (metadata.format !== "jpeg" || !metadata.width || !metadata.height) {
        throw new Error("The X-M5 returned an invalid JPEG.");
      }
      this.lastFileName = filename;
      this.verifiedAt = new Date().toISOString();
      this.lastError = null;
      return { buffer, filename };
    } catch (error) {
      this.lastError = cameraErrorMessage(error);
      throw new Error(this.lastError);
    } finally {
      this.capturing = false;
      await rm(directory, { recursive: true, force: true });
    }
  }
}
