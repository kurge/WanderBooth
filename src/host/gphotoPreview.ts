import { spawn } from "node:child_process";

// JPEG segments may contain an embedded thumbnail. Skip length-delimited segments
// rather than mistaking the thumbnail's end marker for the end of a live frame.
export class JpegStreamDecoder {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > 8 * 1024 * 1024) {
      this.buffer = Buffer.alloc(0);
      throw new Error("The camera preview exceeded its frame size limit.");
    }
    const frames: Buffer[] = [];
    while (this.buffer.length > 1) {
      const start = this.buffer.indexOf(Buffer.from([0xff, 0xd8]));
      if (start < 0) {
        this.buffer = this.buffer.subarray(-1);
        break;
      }
      this.buffer = this.buffer.subarray(start);
      let offset = 2;
      let end = -1;
      while (offset + 1 < this.buffer.length) {
        if (this.buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = this.buffer[offset + 1];
        if (marker === 0xd9) {
          end = offset + 2;
          break;
        }
        if (marker === 0xff) {
          offset++;
          continue;
        }
        if (marker === 0 || marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) {
          offset += 2;
          continue;
        }
        if (offset + 3 >= this.buffer.length) break;
        const length = this.buffer.readUInt16BE(offset + 2);
        if (length < 2) throw new Error("The camera sent an invalid JPEG segment.");
        if (offset + 2 + length > this.buffer.length) break;
        offset += 2 + length;
      }
      if (end < 0) break;
      frames.push(Buffer.from(this.buffer.subarray(0, end)));
      this.buffer = this.buffer.subarray(end);
    }
    return frames;
  }
}

export type PreviewProcess = { ready: Promise<void>; stop: () => Promise<void> };
export type StartPreview = (
  binary: string,
  args: string[],
  onFrame: (frame: Buffer) => void,
  onError: (error: Error) => void,
) => PreviewProcess;

export const startGPhotoPreview: StartPreview = (binary, args, onFrame, onError) => {
  const child = spawn(binary, args, {
    env: { ...process.env, LANG: "C", LC_ALL: "C" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const decoder = new JpegStreamDecoder();
  let stopping = false;
  let ended = false;
  let failed = false;
  let stderr = "";
  let lastFrameAt = Date.now();
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let resolveClosed: () => void = () => {};
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const fail = (error: Error) => {
    if (failed || stopping) return;
    failed = true;
    rejectReady(error);
    onError(error);
    void stop();
  };
  let stopPromise: Promise<void> | null = null;
  const stop = () => {
    if (stopPromise) return stopPromise;
    stopping = true;
    clearInterval(watchdog);
    rejectReady(new Error("Canon preview stopped."));
    stopPromise = (async () => {
      if (ended) return;
      // Let gPhoto release the USB camera before another command uses it.
      child.kill("SIGINT");
      const timer = setTimeout(() => child.kill("SIGKILL"), 3_000);
      try {
        await closed;
      } finally {
        clearTimeout(timer);
      }
    })();
    return stopPromise;
  };
  const watchdog = setInterval(() => {
    if (Date.now() - lastFrameAt > 12_000) fail(new Error("Canon live preview timed out."));
  }, 1_000);
  watchdog.unref();
  child.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-8_192);
  });
  child.stdout.on("data", (chunk: Buffer) => {
    if (stopping || failed) return;
    try {
      for (const frame of decoder.push(chunk)) {
        lastFrameAt = Date.now();
        onFrame(frame);
        resolveReady();
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error("Canon preview failed."));
    }
  });
  child.once("error", (error) => fail(error));
  child.once("close", () => {
    ended = true;
    clearInterval(watchdog);
    resolveClosed();
    if (!stopping) fail(new Error(stderr || "Canon live preview disconnected."));
  });
  return { ready, stop };
};
