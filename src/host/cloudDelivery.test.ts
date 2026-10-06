// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { EventSessionRecord } from "../shared/session";
import {
  createQrDelivery,
  restoreQrDelivery,
  uploadFilesForSession,
  uploadSessionDelivery,
  validateCloudDeliveryConfig,
} from "./cloudDelivery";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const makeSession = (): EventSessionRecord => ({
  id: "session-qr-test",
  number: 1,
  customerName: null,
  startedAt: "2026-10-06T00:00:00.000Z",
  completedAt: "2026-10-06T00:03:00.000Z",
  productId: "three-photo-strip",
  layoutId: "vertical-2x6",
  templateId: null,
  templateName: null,
  captures: [],
  deliverables: [
    {
      kind: "individual",
      label: "Branded photo 1",
      mediaUrl: "/media/events/event-qr/sessions/session-qr-test/deliverables/photo-1.png",
      mimeType: "image/png",
    },
    {
      kind: "strip",
      label: "Finished 2×6 strip",
      mediaUrl: "/media/events/event-qr/sessions/session-qr-test/deliverables/layout.png",
      mimeType: "image/png",
    },
    {
      kind: "print",
      label: "4×6 print sheet",
      mediaUrl: "/media/events/event-qr/sessions/session-qr-test/deliverables/print.png",
      mimeType: "image/png",
    },
  ],
  printAttempts: [],
  qrDelivery: createQrDelivery(
    { baseUrl: "https://wanderbooth.example.workers.dev", deviceToken: "a".repeat(32) },
    "2026-10-06T00:03:00.000Z",
    "abcdefghijklmnopqrstuvwxyzABCDEF",
  ),
});

describe("cloud QR delivery", () => {
  it("creates one stable 30-day private link", () => {
    const delivery = createQrDelivery(
      { baseUrl: "https://wanderbooth.example.workers.dev", deviceToken: "a".repeat(32) },
      "2026-10-06T00:00:00.000Z",
      "abcdefghijklmnopqrstuvwxyzABCDEF",
    );

    expect(delivery).toMatchObject({
      status: "queued",
      token: "abcdefghijklmnopqrstuvwxyzABCDEF",
      shareUrl: "https://wanderbooth.example.workers.dev/d/abcdefghijklmnopqrstuvwxyzABCDEF",
      expiresAt: "2026-11-05T00:00:00.000Z",
    });
  });

  it("restores an interrupted upload as a queued retry", () => {
    const restored = restoreQrDelivery(
      {
        ...createQrDelivery(
          { baseUrl: "https://wanderbooth.example.workers.dev", deviceToken: "a".repeat(32) },
          new Date(Date.now() - 60_000).toISOString(),
          "abcdefghijklmnopqrstuvwxyzABCDEF",
        ),
        status: "uploading",
      },
      { baseUrl: "https://wanderbooth.example.workers.dev", deviceToken: "a".repeat(32) },
      new Date(Date.now() - 60_000).toISOString(),
    );

    expect(restored.status).toBe("queued");
    expect(restored.nextRetryAt).not.toBeNull();
  });

  it("moves a pending delivery to a newly configured Worker without changing its token", () => {
    const original = createQrDelivery(
      { baseUrl: "https://old.example.workers.dev", deviceToken: "a".repeat(32) },
      new Date(Date.now() - 60_000).toISOString(),
      "abcdefghijklmnopqrstuvwxyzABCDEF",
    );

    const restored = restoreQrDelivery(
      { ...original, status: "failed" },
      { baseUrl: "https://new.example.workers.dev", deviceToken: "b".repeat(32) },
      original.createdAt,
    );

    expect(restored.token).toBe(original.token);
    expect(restored.shareUrl).toBe(
      "https://new.example.workers.dev/d/abcdefghijklmnopqrstuvwxyzABCDEF",
    );
  });

  it("moves a ready delivery to a newly configured Worker without re-uploading it", () => {
    const original = createQrDelivery(
      { baseUrl: "https://old.example.workers.dev", deviceToken: "a".repeat(32) },
      new Date(Date.now() - 60_000).toISOString(),
      "abcdefghijklmnopqrstuvwxyzABCDEF",
    );

    const restored = restoreQrDelivery(
      { ...original, status: "ready", uploadedAt: new Date().toISOString() },
      { baseUrl: "https://new.example.workers.dev", deviceToken: "b".repeat(32) },
      original.createdAt,
    );

    expect(restored.status).toBe("ready");
    expect(restored.attemptCount).toBe(original.attemptCount);
    expect(restored.shareUrl).toBe(
      "https://new.example.workers.dev/d/abcdefghijklmnopqrstuvwxyzABCDEF",
    );
  });

  it("rejects an insecure non-local delivery URL", () => {
    expect(() =>
      validateCloudDeliveryConfig({
        baseUrl: "http://photos.example.com",
        deviceToken: "a".repeat(32),
      }),
    ).toThrow("HTTPS");
  });

  it("uploads branded guest files but excludes the printer-only sheet", async () => {
    const root = await mkdtemp(join(tmpdir(), "wanderbooth-qr-"));
    temporaryDirectories.push(root);
    const directory = join(root, "events/event-qr/sessions/session-qr-test/deliverables");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "photo-1.png"), "photo");
    await writeFile(join(directory, "layout.png"), "layout");
    await writeFile(join(directory, "print.png"), "print");
    const session = makeSession();
    const calls: Array<{ url: string; method: string }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET" });
      return new Response(
        JSON.stringify(
          url.endsWith("/complete") ? { readyAt: "2026-10-06T00:04:00.000Z" } : { ok: true },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    expect(uploadFilesForSession(root, session).map((file) => file.kind)).toEqual([
      "individual",
      "strip",
    ]);
    await expect(
      uploadSessionDelivery({
        config: {
          baseUrl: "https://wanderbooth.example.workers.dev",
          deviceToken: "a".repeat(32),
        },
        dataDirectory: root,
        session,
        fetcher,
      }),
    ).resolves.toBe("2026-10-06T00:04:00.000Z");

    expect(calls).toHaveLength(4);
    expect(calls.map((call) => call.method)).toEqual(["PUT", "PUT", "PUT", "POST"]);
    expect(calls.some((call) => call.url.includes("print"))).toBe(false);
  });
});
