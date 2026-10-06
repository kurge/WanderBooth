import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { EventSessionRecord, QrDelivery } from "../shared/session.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

export type CloudDeliveryConfig = {
  baseUrl: string;
  deviceToken: string;
};

export type PublicCloudDeliveryConfig = {
  baseUrl: string | null;
  configured: boolean;
};

const normalizeBaseUrl = (value: string) => {
  const parsed = new URL(value.trim());
  const isLocalHttp =
    parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error("Use an HTTPS Cloudflare Worker URL, or localhost while developing.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Use the Worker base URL without credentials, query text, or a page path.");
  }
  return parsed.toString().replace(/\/$/, "");
};

export const validateCloudDeliveryConfig = (input: CloudDeliveryConfig): CloudDeliveryConfig => {
  const deviceToken = input.deviceToken.trim();
  if (deviceToken.length < 24 || deviceToken.length > 512) {
    throw new Error("The Cloudflare device token must contain between 24 and 512 characters.");
  }
  return {
    baseUrl: normalizeBaseUrl(input.baseUrl),
    deviceToken,
  };
};

export class CloudDeliveryConfigStore {
  readonly path: string;
  private config: CloudDeliveryConfig | null = null;

  constructor(dataDirectory: string) {
    this.path = resolve(dataDirectory, "cloud-delivery.json");
  }

  async load() {
    if (!existsSync(this.path)) return null;
    try {
      const saved = JSON.parse(await readFile(this.path, "utf8")) as CloudDeliveryConfig;
      this.config = validateCloudDeliveryConfig(saved);
    } catch (error) {
      console.error("Cloud delivery configuration could not be loaded:", error);
      this.config = null;
    }
    return this.config;
  }

  get() {
    return this.config;
  }

  publicConfig(): PublicCloudDeliveryConfig {
    return {
      baseUrl: this.config?.baseUrl ?? null,
      configured: Boolean(this.config),
    };
  }

  async save(input: CloudDeliveryConfig) {
    const config = validateCloudDeliveryConfig(input);
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    await chmod(this.path, 0o600);
    this.config = config;
    return config;
  }
}

const shareUrlFor = (baseUrl: string, token: string) =>
  `${baseUrl.replace(/\/$/, "")}/d/${encodeURIComponent(token)}`;

export const createQrDelivery = (
  config: CloudDeliveryConfig | null,
  completedAt: string,
  token = randomBytes(24).toString("base64url"),
): QrDelivery => {
  const createdAt = completedAt;
  const expiresAt = new Date(Date.parse(createdAt) + THIRTY_DAYS_MS).toISOString();
  return {
    status: config ? "queued" : "not_configured",
    token,
    shareUrl: config ? shareUrlFor(config.baseUrl, token) : null,
    createdAt,
    expiresAt,
    uploadedAt: null,
    lastAttemptAt: null,
    nextRetryAt: config ? createdAt : null,
    attemptCount: 0,
    lastError: null,
  };
};

export const restoreQrDelivery = (
  saved: Partial<QrDelivery> | null | undefined,
  config: CloudDeliveryConfig | null,
  completedAt: string,
): QrDelivery => {
  const fallback = createQrDelivery(config, completedAt, saved?.token);
  const expiresAt = saved?.expiresAt ?? fallback.expiresAt;
  const expired = Date.parse(expiresAt) <= Date.now();
  let status = saved?.status ?? fallback.status;
  if (expired) status = "expired";
  else if (status === "uploading") status = "queued";
  else if (status === "not_configured" && config) status = "queued";
  const shareUrl =
    config && status !== "expired"
      ? shareUrlFor(config.baseUrl, fallback.token)
      : (saved?.shareUrl ??
        (config ? shareUrlFor(config.baseUrl, fallback.token) : fallback.shareUrl));

  return {
    ...fallback,
    ...saved,
    status,
    token: saved?.token ?? fallback.token,
    shareUrl,
    createdAt: saved?.createdAt ?? completedAt,
    expiresAt,
    uploadedAt: saved?.uploadedAt ?? null,
    lastAttemptAt: saved?.lastAttemptAt ?? null,
    nextRetryAt: status === "queued" ? (saved?.nextRetryAt ?? new Date().toISOString()) : null,
    attemptCount: Math.max(0, saved?.attemptCount ?? 0),
    lastError: saved?.lastError ?? null,
  };
};

type UploadFile = {
  id: string;
  kind: "individual" | "strip" | "slideshow";
  label: string;
  mimeType: string;
  path: string;
};

const extensionFor = (mimeType: string, mediaUrl: string) => {
  const fromPath = extname(new URL(mediaUrl, "http://wanderbooth.local").pathname).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(fromPath)) return fromPath;
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "image/jpeg") return ".jpg";
  return ".png";
};

const mediaPath = (dataDirectory: string, mediaUrl: string) => {
  if (!mediaUrl.startsWith("/media/")) {
    throw new Error("Only local WanderBooth deliverables may be uploaded.");
  }
  const relativePath = decodeURIComponent(mediaUrl.slice("/media/".length)).replaceAll("\\", "/");
  const root = resolve(dataDirectory);
  const absolutePath = resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}/`)) {
    throw new Error("A QR deliverable path is outside the WanderBooth data directory.");
  }
  return absolutePath;
};

export const uploadFilesForSession = (
  dataDirectory: string,
  session: EventSessionRecord,
): UploadFile[] => {
  const counters = new Map<string, number>();
  return session.deliverables
    .filter(
      (
        deliverable,
      ): deliverable is EventSessionRecord["deliverables"][number] & {
        kind: UploadFile["kind"];
      } => deliverable.kind !== "print",
    )
    .map((deliverable) => {
      const count = (counters.get(deliverable.kind) ?? 0) + 1;
      counters.set(deliverable.kind, count);
      return {
        id: `${deliverable.kind}-${count}${extensionFor(deliverable.mimeType, deliverable.mediaUrl)}`,
        kind: deliverable.kind,
        label: deliverable.label,
        mimeType: deliverable.mimeType,
        path: mediaPath(dataDirectory, deliverable.mediaUrl),
      };
    });
};

const checkedResponse = async (response: Response, action: string) => {
  if (response.ok) return response;
  const details = (await response.text()).trim().slice(0, 400);
  throw new Error(`${action} failed (${response.status})${details ? `: ${details}` : "."}`);
};

const requestHeaders = (config: CloudDeliveryConfig, extra?: Record<string, string>) => ({
  Authorization: `Bearer ${config.deviceToken}`,
  ...extra,
});

export const testCloudDelivery = async (
  config: CloudDeliveryConfig,
  fetcher: typeof fetch = fetch,
) => {
  const response = await fetcher(`${config.baseUrl}/api/v1/device-health`, {
    headers: requestHeaders(config),
    signal: AbortSignal.timeout(15_000),
  });
  await checkedResponse(response, "Cloudflare connection test");
};

export const uploadSessionDelivery = async (input: {
  config: CloudDeliveryConfig;
  dataDirectory: string;
  session: EventSessionRecord;
  fetcher?: typeof fetch;
}) => {
  const fetcher = input.fetcher ?? fetch;
  const files = uploadFilesForSession(input.dataDirectory, input.session);
  if (!files.length) throw new Error("This session has no branded files to upload.");

  const delivery = input.session.qrDelivery;
  await checkedResponse(
    await fetcher(`${input.config.baseUrl}/api/v1/deliveries/${delivery.token}`, {
      method: "PUT",
      headers: requestHeaders(input.config, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        createdAt: delivery.createdAt,
        expiresAt: delivery.expiresAt,
        files: files.map(({ id, kind, label, mimeType }) => ({ id, kind, label, mimeType })),
      }),
      signal: AbortSignal.timeout(30_000),
    }),
    "Preparing the QR gallery",
  );

  for (const file of files) {
    const body = await readFile(file.path);
    await checkedResponse(
      await fetcher(
        `${input.config.baseUrl}/api/v1/deliveries/${delivery.token}/files/${encodeURIComponent(file.id)}`,
        {
          method: "PUT",
          headers: requestHeaders(input.config, {
            "Content-Length": String(body.byteLength),
            "Content-Type": file.mimeType,
          }),
          body,
          signal: AbortSignal.timeout(90_000),
        },
      ),
      `Uploading ${file.label}`,
    );
  }

  const completedResponse = await checkedResponse(
    await fetcher(`${input.config.baseUrl}/api/v1/deliveries/${delivery.token}/complete`, {
      method: "POST",
      headers: requestHeaders(input.config),
      signal: AbortSignal.timeout(30_000),
    }),
    "Completing the QR gallery",
  );
  const result = (await completedResponse.json()) as { readyAt?: string };
  return result.readyAt ?? new Date().toISOString();
};
