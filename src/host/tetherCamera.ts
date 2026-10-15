import { existsSync } from "node:fs";
import { chmod, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import sharp from "sharp";

type TetherCameraConfig = {
  downloadDirectory: string;
  verifiedAt: string | null;
};

export type TetherCameraStatus = {
  configured: boolean;
  downloadDirectory: string | null;
  lastError: string | null;
  lastFileName: string | null;
  ready: boolean;
  verifiedAt: string | null;
};

type TetherFile = {
  filename: string;
  fingerprint: string;
  modifiedAt: number;
  path: string;
};

export type TetherFolderSnapshot = Map<string, string>;

export type ImportedTetherPhoto = {
  buffer: Buffer;
  filename: string;
};

const jpegPattern = /\.jpe?g$/i;

const normalizeDirectoryPath = (directory: string) => {
  const normalized = directory.trim();
  if (!normalized || !isAbsolute(normalized)) {
    throw new Error("Choose an absolute folder on this computer for Fujifilm downloads.");
  }
  return resolve(normalized);
};

const validateDirectory = async (directory: string) => {
  const normalized = normalizeDirectoryPath(directory);
  const details = await stat(normalized).catch(() => null);
  if (!details?.isDirectory()) {
    throw new Error("The selected Fujifilm download folder is no longer available.");
  }
  await readdir(normalized);
  return normalized;
};

const listJpegs = async (directory: string): Promise<TetherFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && jpegPattern.test(entry.name))
      .map(async (entry) => {
        const path = resolve(directory, entry.name);
        const details = await stat(path).catch(() => null);
        if (!details?.isFile()) return null;
        return {
          filename: entry.name,
          fingerprint: `${details.size}:${details.mtimeMs}:${details.ctimeMs}`,
          modifiedAt: details.mtimeMs,
          path,
        };
      }),
  );
  return files
    .filter((file): file is TetherFile => file !== null)
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
};

export class TetherCameraBridge {
  readonly path: string;
  private config: TetherCameraConfig | null = null;
  private lastError: string | null = null;
  private lastFileName: string | null = null;

  constructor(dataDirectory: string) {
    this.path = resolve(dataDirectory, "tether-camera.json");
  }

  async load() {
    if (!existsSync(this.path)) return null;
    try {
      const saved = JSON.parse(await readFile(this.path, "utf8")) as Partial<TetherCameraConfig>;
      const downloadDirectory = normalizeDirectoryPath(saved.downloadDirectory ?? "");
      this.config = {
        downloadDirectory,
        verifiedAt: saved.verifiedAt ?? null,
      };
      await this.status();
    } catch (error) {
      this.config = null;
      this.lastError =
        error instanceof Error ? error.message : "The Fujifilm folder could not be loaded.";
    }
    return this.config;
  }

  async configure(downloadDirectory: string) {
    const validated = await validateDirectory(downloadDirectory);
    this.config = { downloadDirectory: validated, verifiedAt: null };
    this.lastError = null;
    this.lastFileName = null;
    await this.persist();
    return this.status();
  }

  async status(): Promise<TetherCameraStatus> {
    if (!this.config) {
      return {
        configured: false,
        downloadDirectory: null,
        lastError: this.lastError,
        lastFileName: this.lastFileName,
        ready: false,
        verifiedAt: null,
      };
    }

    try {
      await validateDirectory(this.config.downloadDirectory);
      this.lastError = null;
      return {
        configured: true,
        downloadDirectory: this.config.downloadDirectory,
        lastError: null,
        lastFileName: this.lastFileName,
        ready: true,
        verifiedAt: this.config.verifiedAt,
      };
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : "The Fujifilm folder is not available.";
      return {
        configured: true,
        downloadDirectory: this.config.downloadDirectory,
        lastError: this.lastError,
        lastFileName: this.lastFileName,
        ready: false,
        verifiedAt: this.config.verifiedAt,
      };
    }
  }

  async snapshot(): Promise<TetherFolderSnapshot> {
    const directory = await this.readyDirectory();
    const files = await listJpegs(directory);
    return new Map(files.map((file) => [file.path, file.fingerprint]));
  }

  async waitForNewJpeg(
    baseline: TetherFolderSnapshot,
    timeoutMilliseconds = 45_000,
  ): Promise<ImportedTetherPhoto> {
    const directory = await this.readyDirectory();
    const deadline = Date.now() + timeoutMilliseconds;
    let stableCandidate: TetherFile | null = null;

    while (Date.now() < deadline) {
      const candidate = (await listJpegs(directory)).find(
        (file) => baseline.get(file.path) !== file.fingerprint,
      );

      if (candidate && candidate.fingerprint === stableCandidate?.fingerprint) {
        const buffer = await readFile(candidate.path);
        const details = await stat(candidate.path).catch(() => null);
        const fingerprint = details
          ? `${details.size}:${details.mtimeMs}:${details.ctimeMs}`
          : null;
        const hasJpegEndMarker =
          buffer.length > 2 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
        if (fingerprint !== candidate.fingerprint || !hasJpegEndMarker) {
          stableCandidate = null;
          await delay(250);
          continue;
        }

        try {
          const metadata = await sharp(buffer).metadata();
          if (metadata.format === "jpeg" && metadata.width && metadata.height) {
            this.lastFileName = candidate.filename;
            this.lastError = null;
            return { buffer, filename: candidate.filename };
          }
        } catch {
          // A file can pause while FUJIFILM TETHER APP is still writing it. Keep waiting.
        }
        stableCandidate = null;
      }

      stableCandidate = candidate ?? null;
      await delay(250);
    }

    this.lastError =
      "No new complete JPEG arrived. Check the X-M5 cable, Fujifilm Tether App, and download folder, then retry the session.";
    throw new Error(this.lastError);
  }

  async markVerified(filename: string) {
    if (!this.config) return;
    this.config = { ...this.config, verifiedAt: new Date().toISOString() };
    this.lastFileName = filename;
    this.lastError = null;
    await this.persist();
  }

  private async readyDirectory() {
    if (!this.config) {
      throw new Error("Choose the Fujifilm Tether App download folder before starting a session.");
    }
    return validateDirectory(this.config.downloadDirectory);
  }

  private async persist() {
    if (!this.config) return;
    await mkdir(resolve(this.path, ".."), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(this.config, null, 2)}\n`, { mode: 0o600 });
    await chmod(this.path, 0o600);
  }
}
