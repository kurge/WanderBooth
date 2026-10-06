import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, resolve } from "node:path";

import WebSocket, { WebSocketServer } from "ws";

import { takeSimulatedPhoto } from "../camera/simulator.js";
import {
  type CustomOverlayMode,
  getLayout,
  getOverlay,
  normalizeMediaTransform,
  normalizePhotoTransform,
} from "../shared/catalog.js";
import { isPhotoFilterId } from "../shared/filters.js";
import type { ClientMessage, ServerMessage } from "../shared/protocol.js";
import {
  type Actor,
  type BoothState,
  type Command,
  CommandError,
  initialBoothState,
  reduceCommand,
} from "../shared/session.js";
import {
  CloudDeliveryConfigStore,
  createQrDelivery,
  restoreQrDelivery,
  testCloudDelivery,
  uploadSessionDelivery,
  validateCloudDeliveryConfig,
} from "./cloudDelivery.js";
import { importCustomOverlay } from "./customOverlay.js";
import { BoothDatabase } from "./database.js";
import { buildDeliverables } from "./deliverables.js";

const port = Number(process.env.WANDERBOOTH_HOST_PORT ?? 4174);
const dataDirectory = resolve(process.env.WANDERBOOTH_DATA_DIR ?? "data/runtime");
const webDirectory = process.env.WANDERBOOTH_WEB_DIR
  ? resolve(process.env.WANDERBOOTH_WEB_DIR)
  : null;
await mkdir(dataDirectory, { recursive: true });

const cloudDeliveryConfigStore = new CloudDeliveryConfigStore(dataDirectory);
await cloudDeliveryConfigStore.load();
const database = new BoothDatabase(dataDirectory);
const defaultState = initialBoothState();
const savedState = database.loadState();
const savedCustomOverlays = savedState?.customOverlays ?? [];
const migrationTimestamp = new Date().toISOString();
const generalFolder = {
  id: "folder-general",
  name: "General",
  createdAt: migrationTimestamp,
  updatedAt: migrationTimestamp,
};
const savedTemplateFolders = savedState?.templateFolders?.length
  ? savedState.templateFolders
  : [generalFolder];
const normalizeSavedTemplate = (
  template: (typeof defaultState.savedTemplates)[number],
  fallbackFolderIds: string[] = [],
) => ({
  ...template,
  folderIds: template.folderIds?.length ? template.folderIds : fallbackFolderIds,
  sourceTemplateId: template.sourceTemplateId ?? null,
  customSlots: template.customSlots ?? null,
  frameTransform: normalizeMediaTransform(template.frameTransform),
  holderTransforms: (template.holderTransforms ?? []).map(({ slot, ...transform }) => ({
    slot,
    ...normalizeMediaTransform(transform),
  })),
  photoTransforms: (template.photoTransforms ?? []).map(({ slot, ...transform }) => ({
    slot,
    ...normalizePhotoTransform(transform),
  })),
});
const savedTemplates = (savedState?.savedTemplates ?? []).map((template) =>
  normalizeSavedTemplate(template, [savedTemplateFolders[0]?.id ?? generalFolder.id]),
);
const normalizeCapture = (capture: BoothState["captures"][number]) => ({
  ...capture,
  filterId: isPhotoFilterId(capture.filterId) ? capture.filterId : "original",
});
const savedEvents = (savedState?.events ?? []).map((event) => ({
  ...event,
  templates: (event.templates ?? []).map((template) => normalizeSavedTemplate(template)),
  sessions: (event.sessions ?? []).map((session) => ({
    ...session,
    captures: (session.captures ?? []).map(normalizeCapture),
    printAttempts: session.printAttempts ?? [],
    qrDelivery: restoreQrDelivery(
      session.qrDelivery,
      cloudDeliveryConfigStore.get(),
      session.completedAt,
    ),
  })),
}));
const savedOverlay = savedState
  ? getOverlay(savedState.overlayId ?? "none", savedCustomOverlays)
  : null;
const savedFrameMode =
  savedState?.frameMode ??
  (savedOverlay?.kind === "custom" ? "custom" : savedState?.designId ? "color" : null);
let state: BoothState = savedState
  ? {
      ...defaultState,
      ...savedState,
      schemaVersion: 14,
      cameraSourceId: savedState.cameraSourceId ?? "simulator",
      pendingCapture: savedState.pendingCapture ?? null,
      captureSequence: savedState.captureSequence ?? null,
      overlayId: savedState.overlayId ?? "none",
      customOverlays: savedCustomOverlays,
      templateFolders: savedTemplateFolders,
      savedTemplates,
      events: savedEvents,
      activeEventId: savedState.activeEventId ?? null,
      templateGalleryScope: savedState.templateGalleryScope ?? "library",
      selectedTemplateId: savedState.selectedTemplateId ?? null,
      templateEditor: savedState.templateEditor
        ? {
            ...savedState.templateEditor,
            startingFolderIds: savedState.templateEditor.startingFolderIds ?? [],
          }
        : null,
      customSlots: savedState.customSlots ?? null,
      frameMode: savedFrameMode,
      designId: savedFrameMode === "custom" ? null : savedState.designId,
      frameTransform: normalizeMediaTransform(savedState.frameTransform),
      holderTransforms: (savedState.holderTransforms ?? []).map(({ slot, ...transform }) => ({
        slot,
        ...normalizeMediaTransform(transform),
      })),
      photoTransforms: (savedState.photoTransforms ?? []).map(({ slot, ...transform }) => ({
        slot,
        ...normalizePhotoTransform(transform),
      })),
      captures: (savedState.captures ?? []).map(normalizeCapture),
      sessionCustomerName: savedState.sessionCustomerName ?? null,
      sessionStartedAt: savedState.sessionStartedAt ?? null,
    }
  : defaultState;
database.saveState(state);

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const sendJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const customerUrls = () => {
  const urls = new Set<string>();
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (
        address.family === "IPv4" &&
        !address.internal &&
        !address.address.startsWith("169.254.")
      ) {
        urls.add(`http://${address.address}:${port}/?surface=customer`);
      }
    }
  }
  return [...urls];
};

const serveFile = (response: ServerResponse, absolutePath: string) => {
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(absolutePath).toLowerCase()] ?? "application/octet-stream",
  });
  createReadStream(absolutePath).pipe(response);
};

const readImageBody = async (
  request: IncomingMessage,
  maximumBytes = 15 * 1024 * 1024,
  label = "image",
) => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maximumBytes) {
      throw new CommandError(`The ${label} is too large.`);
    }
    chunks.push(buffer);
  }

  if (totalBytes === 0) throw new CommandError(`The ${label} file is empty.`);
  return Buffer.concat(chunks);
};

const readJsonBody = async <T>(request: IncomingMessage, maximumBytes = 32 * 1024) => {
  const buffer = await readImageBody(request, maximumBytes, "request");
  try {
    return JSON.parse(buffer.toString("utf8")) as T;
  } catch {
    throw new CommandError("The request must contain valid JSON.");
  }
};

const isLoopbackRequest = (request: IncomingMessage) => {
  const address = request.socket.remoteAddress ?? "";
  return address === "::1" || address === "127.0.0.1" || address === "::ffff:127.0.0.1";
};

let commandQueue = Promise.resolve();
let countdownTimer: ReturnType<typeof setTimeout> | null = null;
const previewClients = new Set<ServerResponse>();

const broadcastPreviewFrame = (frame: Buffer) => {
  const header = Buffer.from(
    `--wanderbooth-frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`,
  );
  for (const client of previewClients) {
    if (client.writableEnded || client.destroyed) {
      previewClients.delete(client);
      continue;
    }
    client.write(header);
    client.write(frame);
    client.write("\r\n");
  }
};

const receiveCameraPreview = async (request: IncomingMessage, response: ServerResponse) => {
  if (state.cameraSourceId !== "macbook_camera") {
    throw new CommandError("The MacBook camera is not the selected source.");
  }
  if (request.headers["content-type"]?.split(";")[0] !== "image/jpeg") {
    throw new CommandError("Camera preview frames must be JPEG images.");
  }

  const frame = await readImageBody(request, 1024 * 1024);
  broadcastPreviewFrame(frame);
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  response.end();
};

const streamCameraPreview = (response: ServerResponse) => {
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Connection: "keep-alive",
    "Content-Type": "multipart/x-mixed-replace; boundary=wanderbooth-frame",
  });
  previewClients.add(response);
  response.on("close", () => previewClients.delete(response));
  response.on("error", () => previewClients.delete(response));
};

const receiveCameraCapture = async (request: IncomingMessage, response: ServerResponse) => {
  if (state.cameraSourceId !== "macbook_camera") {
    throw new CommandError("The MacBook camera is not the selected source.");
  }
  if (state.phase !== "capturing" || !state.pendingCapture || !state.sessionId) {
    throw new CommandError("There is no pending camera capture.");
  }
  if (request.headers["content-type"]?.split(";")[0] !== "image/jpeg") {
    throw new CommandError("Camera captures must be JPEG images.");
  }
  if (request.headers["x-session-id"] !== state.sessionId) {
    throw new CommandError("That camera capture belongs to an expired session.");
  }

  const pending = state.pendingCapture;
  const sessionId = safeSessionId(state.sessionId);
  const eventId = state.activeEventId ? safeEventId(state.activeEventId) : null;
  const body = await readImageBody(request);
  const sessionRoot = eventId
    ? resolve(dataDirectory, "events", eventId, "sessions", sessionId)
    : resolve(dataDirectory, "sessions", sessionId);
  const captureDirectory = resolve(sessionRoot, "captures");
  await mkdir(captureDirectory, { recursive: true });
  const filename = `photo-${pending.slot}-r${pending.revision}.jpg`;
  await writeFile(resolve(captureDirectory, filename), body);

  systemCommit({
    type: pending.kind === "retake" ? "RETAKE_COMPLETED" : "CAPTURE_COMPLETED",
    capture: {
      slot: pending.slot,
      revision: pending.revision,
      mediaUrl: eventId
        ? `/media/events/${eventId}/sessions/${sessionId}/captures/${filename}`
        : `/media/sessions/${sessionId}/captures/${filename}`,
      capturedAt: new Date().toISOString(),
      filterId: "original",
    },
  });
  scheduleCountdownStep(1_200);
  sendJson(response, 201, { ok: true });
};

const headerValue = (request: IncomingMessage, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const receiveOverlayImport = async (request: IncomingMessage, response: ServerResponse) => {
  if (!["idle", "template_gallery", "selecting", "reviewing"].includes(state.phase)) {
    throw new CommandError("Import designs before payment, or while reviewing the photos.");
  }

  const contentType = request.headers["content-type"]?.split(";")[0] ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
    throw new CommandError("Choose a PNG, JPEG, or WebP design file.");
  }

  const layoutId = headerValue(request, "x-wanderbooth-layout-id") ?? "";
  const layout = getLayout(layoutId);
  if (!layout) throw new CommandError("Choose a valid layout before importing the design.");

  const mode = headerValue(request, "x-wanderbooth-overlay-mode");
  if (mode !== "transparent_artwork" && mode !== "flat_template") {
    throw new CommandError("Choose how WanderBooth should prepare this design.");
  }

  let name = "";
  try {
    name = decodeURIComponent(headerValue(request, "x-wanderbooth-overlay-name") ?? "");
  } catch {
    throw new CommandError("The design name could not be read.");
  }

  const source = await readImageBody(request, 25 * 1024 * 1024, "design");
  const overlay = await importCustomOverlay({
    source,
    dataDirectory,
    layout,
    importMode: mode as CustomOverlayMode,
    name,
  }).catch((error: unknown) => {
    throw new CommandError(
      error instanceof Error ? error.message : "The design could not be prepared.",
    );
  });
  systemCommit({ type: "REGISTER_CUSTOM_OVERLAY", overlay });
  sendJson(response, 201, { overlay });
};

const overlayPathFromMediaUrl = (mediaUrl: string) => {
  const relativePath = decodeURIComponent(mediaUrl.replace(/^\/media\//, "")).replaceAll("\\", "/");
  const absolutePath = resolve(dataDirectory, relativePath);
  if (!absolutePath.startsWith(`${dataDirectory}/`)) {
    throw new CommandError("The imported frame file path is invalid.");
  }
  return absolutePath;
};

const receiveOverlayDelete = async (overlayId: string, response: ServerResponse) => {
  if (!["idle", "template_gallery", "selecting", "reviewing"].includes(state.phase)) {
    throw new CommandError("Delete imported frames before payment, or while reviewing photos.");
  }
  const overlay = state.customOverlays.find((item) => item.id === overlayId);
  if (!overlay) throw new CommandError("That imported frame is no longer available.");
  if (
    state.savedTemplates.some((template) => template.overlayId === overlay.id) ||
    state.events.some((event) =>
      event.templates.some((template) => template.overlayId === overlay.id),
    )
  ) {
    throw new CommandError("Delete templates using this artwork before deleting the artwork.");
  }

  const files = new Set([overlay.mediaUrl, overlay.sourceMediaUrl].filter(Boolean) as string[]);
  await Promise.all(
    [...files].map(async (mediaUrl) => {
      try {
        await unlink(overlayPathFromMediaUrl(mediaUrl));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }),
  );
  systemCommit({ type: "DELETE_CUSTOM_OVERLAY", overlayId });
  sendJson(response, 200, { ok: true });
};

const receiveCloudDeliveryConfig = async (request: IncomingMessage, response: ServerResponse) => {
  if (!isLoopbackRequest(request)) {
    sendJson(response, 403, { error: "Cloud delivery can be configured only on this computer." });
    return;
  }
  const input = await readJsonBody<{ baseUrl?: string; deviceToken?: string }>(request);
  const config = validateCloudDeliveryConfig({
    baseUrl: input.baseUrl ?? "",
    deviceToken: input.deviceToken ?? "",
  });
  await testCloudDelivery(config);
  await cloudDeliveryConfigStore.save(config);

  for (const event of state.events) {
    for (const session of event.sessions) {
      if (
        session.qrDelivery.status !== "ready" &&
        session.qrDelivery.status !== "expired" &&
        Date.parse(session.qrDelivery.expiresAt) > Date.now()
      ) {
        systemCommit({
          type: "UPDATE_QR_DELIVERY",
          eventId: event.id,
          sessionId: session.id,
          delivery: restoreQrDelivery(session.qrDelivery, config, session.completedAt),
        });
      }
    }
  }
  scheduleDeliveryQueue(100);
  sendJson(response, 200, cloudDeliveryConfigStore.publicConfig());
};

const httpServer = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers":
        "Content-Type, X-Session-Id, X-WanderBooth-Layout-Id, X-WanderBooth-Overlay-Mode, X-WanderBooth-Overlay-Name",
      "Access-Control-Allow-Methods": "DELETE, GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/cloud-delivery/config") {
    if (!isLoopbackRequest(request)) {
      sendJson(response, 403, {
        error: "Cloud delivery can be configured only on this computer.",
      });
      return;
    }
    sendJson(response, 200, cloudDeliveryConfigStore.publicConfig());
    return;
  }

  if (request.method === "PUT" && requestUrl.pathname === "/api/cloud-delivery/config") {
    commandQueue = commandQueue
      .then(() => receiveCloudDeliveryConfig(request, response))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Cloud delivery could not be configured.";
        sendJson(response, error instanceof CommandError ? 409 : 502, { error: message });
      });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/camera-captures") {
    commandQueue = commandQueue
      .then(() => receiveCameraCapture(request, response))
      .catch((error) => {
        const message = error instanceof Error ? error.message : "The photo could not be saved.";
        sendJson(response, error instanceof CommandError ? 409 : 500, { error: message });
      });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/overlays") {
    commandQueue = commandQueue
      .then(() => receiveOverlayImport(request, response))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "The design could not be imported.";
        sendJson(response, error instanceof CommandError ? 409 : 500, { error: message });
      });
    return;
  }

  if (request.method === "DELETE" && requestUrl.pathname.startsWith("/api/overlays/")) {
    commandQueue = commandQueue
      .then(() =>
        receiveOverlayDelete(
          decodeURIComponent(requestUrl.pathname.slice("/api/overlays/".length)),
          response,
        ),
      )
      .catch((error) => {
        const message = error instanceof Error ? error.message : "The design could not be deleted.";
        sendJson(response, error instanceof CommandError ? 409 : 500, { error: message });
      });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/camera-preview") {
    void receiveCameraPreview(request, response).catch((error) => {
      const message = error instanceof Error ? error.message : "The preview frame was rejected.";
      sendJson(response, error instanceof CommandError ? 409 : 500, { error: message });
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/camera-preview") {
    streamCameraPreview(response);
    return;
  }

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "wanderbooth-host",
      phase: state.phase,
      revision: state.revision,
    });
    return;
  }

  if (requestUrl.pathname === "/api/state") {
    sendJson(response, 200, state);
    return;
  }

  if (requestUrl.pathname === "/api/info") {
    sendJson(response, 200, {
      customerUrls: customerUrls(),
      cloudDelivery: cloudDeliveryConfigStore.publicConfig(),
      service: "wanderbooth-host",
    });
    return;
  }

  if (requestUrl.pathname.startsWith("/media/")) {
    const relativePath = decodeURIComponent(requestUrl.pathname.slice("/media/".length)).replaceAll(
      "\\",
      "/",
    );
    const absolutePath = resolve(dataDirectory, relativePath);
    const safeRoot = `${dataDirectory}/`;
    if (!absolutePath.startsWith(safeRoot) || !existsSync(absolutePath)) {
      sendJson(response, 404, { error: "Media not found." });
      return;
    }

    serveFile(response, absolutePath);
    return;
  }

  if (request.method === "GET" && webDirectory) {
    const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const absolutePath = resolve(webDirectory, `.${decodeURIComponent(requestedPath)}`);
    const safeRoot = `${webDirectory}/`;
    if (absolutePath.startsWith(safeRoot) && existsSync(absolutePath)) {
      serveFile(response, absolutePath);
      return;
    }

    const indexPath = resolve(webDirectory, "index.html");
    if (existsSync(indexPath)) {
      serveFile(response, indexPath);
      return;
    }
  }

  sendJson(response, 404, { error: "Route not found." });
});

const socketServer = new WebSocketServer({ server: httpServer, path: "/ws" });
const clientActors = new WeakMap<WebSocket, { actor: Actor; clientId: string }>();

const send = (socket: WebSocket, message: ServerMessage) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

const broadcastState = () => {
  const message = JSON.stringify({ type: "STATE", state } satisfies ServerMessage);
  for (const client of socketServer.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
};

const commit = (nextState: BoothState, actor: Actor, command: Command, commandId?: string) => {
  state = nextState;
  if (state.phase !== "countdown" && countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
  database.saveState(state);
  database.recordEvent({
    sessionId: state.sessionId,
    commandId,
    actor,
    command,
  });
  broadcastState();
};

const systemCommit = (command: Command) => {
  commit(reduceCommand(state, command, "system"), "system", command);
};

let deliveryTimer: ReturnType<typeof setTimeout> | null = null;
let deliveryProcessing = false;

const nextDeliveryJob = () => {
  const nowMilliseconds = Date.now();
  for (const event of state.events) {
    for (const session of event.sessions) {
      const delivery = session.qrDelivery;
      if (
        ["queued", "failed"].includes(delivery.status) &&
        Date.parse(delivery.expiresAt) > nowMilliseconds &&
        (!delivery.nextRetryAt || Date.parse(delivery.nextRetryAt) <= nowMilliseconds)
      ) {
        return { event, session };
      }
    }
  }
  return null;
};

const nextScheduledDeliveryAt = () => {
  const retryTimes = state.events.flatMap((event) =>
    event.sessions
      .filter(
        (session) =>
          ["queued", "failed"].includes(session.qrDelivery.status) &&
          Date.parse(session.qrDelivery.expiresAt) > Date.now() &&
          session.qrDelivery.nextRetryAt,
      )
      .map((session) => Date.parse(session.qrDelivery.nextRetryAt ?? ""))
      .filter(Number.isFinite),
  );
  return retryTimes.length ? Math.min(...retryTimes) : null;
};

const scheduleDeliveryQueue = (delayMilliseconds = 500) => {
  if (deliveryTimer) clearTimeout(deliveryTimer);
  deliveryTimer = setTimeout(
    () => {
      deliveryTimer = null;
      void runDeliveryQueue();
    },
    Math.max(0, delayMilliseconds),
  );
};

const runDeliveryQueue = async () => {
  if (deliveryProcessing) return;
  const config = cloudDeliveryConfigStore.get();
  if (!config) return;
  const job = nextDeliveryJob();
  if (!job) {
    const nextRetryAt = nextScheduledDeliveryAt();
    if (nextRetryAt) scheduleDeliveryQueue(Math.min(5 * 60_000, nextRetryAt - Date.now()));
    return;
  }

  deliveryProcessing = true;
  const attemptAt = new Date().toISOString();
  const uploading = {
    ...job.session.qrDelivery,
    status: "uploading" as const,
    lastAttemptAt: attemptAt,
    nextRetryAt: null,
    attemptCount: job.session.qrDelivery.attemptCount + 1,
    lastError: null,
  };
  systemCommit({
    type: "UPDATE_QR_DELIVERY",
    eventId: job.event.id,
    sessionId: job.session.id,
    delivery: uploading,
  });

  try {
    const currentSession = state.events
      .find((event) => event.id === job.event.id)
      ?.sessions.find((session) => session.id === job.session.id);
    if (!currentSession) throw new Error("The local session was removed during upload.");
    const uploadedAt = await uploadSessionDelivery({
      config,
      dataDirectory,
      session: currentSession,
    });
    systemCommit({
      type: "UPDATE_QR_DELIVERY",
      eventId: job.event.id,
      sessionId: job.session.id,
      delivery: {
        ...uploading,
        status: "ready",
        uploadedAt,
        nextRetryAt: null,
        lastError: null,
      },
    });
  } catch (error) {
    const retryDelays = [10_000, 30_000, 2 * 60_000, 5 * 60_000, 10 * 60_000];
    const retryDelay = retryDelays[Math.min(uploading.attemptCount - 1, retryDelays.length - 1)];
    const expired = Date.parse(uploading.expiresAt) <= Date.now();
    systemCommit({
      type: "UPDATE_QR_DELIVERY",
      eventId: job.event.id,
      sessionId: job.session.id,
      delivery: {
        ...uploading,
        status: expired ? "expired" : "failed",
        nextRetryAt: expired ? null : new Date(Date.now() + retryDelay).toISOString(),
        lastError: error instanceof Error ? error.message : "The cloud upload failed.",
      },
    });
  } finally {
    deliveryProcessing = false;
    scheduleDeliveryQueue(250);
  }
};

const safeSessionId = (sessionId: string) => {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) {
    throw new CommandError("The session identifier is invalid.");
  }
  return sessionId;
};

const safeEventId = (eventId: string) => {
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(eventId)) {
    throw new CommandError("The event identifier is invalid.");
  }
  return eventId;
};

const runSimulatorPendingCapture = async (sessionId: string) => {
  const pending = state.pendingCapture;
  if (!pending) throw new CommandError("The simulator capture was not scheduled.");
  const result = await takeSimulatedPhoto({
    dataDirectory,
    eventId: state.activeEventId,
    sessionId,
    slot: pending.slot,
    revision: pending.revision,
  });
  systemCommit({
    type: pending.kind === "retake" ? "RETAKE_COMPLETED" : "CAPTURE_COMPLETED",
    capture: {
      slot: pending.slot,
      revision: pending.revision,
      mediaUrl: result.mediaUrl,
      capturedAt: result.capturedAt,
      filterId: "original",
    },
  });
  scheduleCountdownStep(1_200);
};

const runCountdownStep = async () => {
  if (state.phase !== "countdown" || !state.captureSequence) return;

  if (state.captureSequence.remaining > 1) {
    systemCommit({
      type: "COUNTDOWN_TICK",
      remaining: state.captureSequence.remaining - 1,
    });
    scheduleCountdownStep(1_000);
    return;
  }

  const sessionId = safeSessionId(state.sessionId ?? "");
  systemCommit({ type: "COUNTDOWN_TRIGGER" });
  if (state.cameraSourceId === "simulator") {
    await runSimulatorPendingCapture(sessionId);
  }
};

const scheduleCountdownStep = (delayMilliseconds = 1_000) => {
  if (countdownTimer) clearTimeout(countdownTimer);
  if (state.phase !== "countdown" || !state.captureSequence) {
    countdownTimer = null;
    return;
  }

  countdownTimer = setTimeout(() => {
    countdownTimer = null;
    commandQueue = commandQueue.then(runCountdownStep).catch((error) => {
      const message = error instanceof Error ? error.message : "The countdown failed.";
      console.error("Countdown failed:", error);
      if (["countdown", "capturing"].includes(state.phase)) {
        systemCommit({ type: "FAIL", message });
      }
    });
  }, delayMilliseconds);
};

const runCapture = async (
  command: Extract<Command, { type: "CAPTURE" }>,
  actor: Actor,
  id: string,
) => {
  const sessionId = safeSessionId(state.sessionId ?? "");
  commit(reduceCommand(state, command, actor), actor, command, id);
  if (state.cameraSourceId === "macbook_camera") return;
  await runSimulatorPendingCapture(sessionId);
};

const runApproval = async (
  command: Extract<Command, { type: "APPROVE" }>,
  actor: Actor,
  id: string,
) => {
  commit(reduceCommand(state, command, actor), actor, command, id);
  const deliverables = await buildDeliverables(state, dataDirectory);
  systemCommit({
    type: "PROCESSING_COMPLETED",
    deliverables,
    qrDelivery: createQrDelivery(cloudDeliveryConfigStore.get(), new Date().toISOString()),
  });
  scheduleDeliveryQueue(100);
};

const runDeleteEvent = async (
  command: Extract<Command, { type: "DELETE_EVENT" }>,
  actor: Actor,
  id: string,
) => {
  const eventId = safeEventId(command.eventId);
  const nextState = reduceCommand(state, command, actor);
  await rm(resolve(dataDirectory, "events", eventId), { recursive: true, force: true });
  commit(nextState, actor, command, id);
};

const processMessage = async (socket: WebSocket, rawData: WebSocket.RawData) => {
  let message: ClientMessage;
  try {
    message = JSON.parse(rawData.toString()) as ClientMessage;
  } catch {
    send(socket, { type: "ERROR", message: "Message was not valid JSON." });
    return;
  }

  if (message.type === "HELLO") {
    clientActors.set(socket, { actor: message.actor, clientId: message.clientId });
    send(socket, { type: "STATE", state });
    return;
  }

  if (message.type !== "COMMAND") {
    send(socket, { type: "ERROR", message: "Unknown message type." });
    return;
  }

  const identity = clientActors.get(socket);
  if (!identity || identity.actor !== message.actor || identity.clientId !== message.clientId) {
    send(socket, {
      type: "ERROR",
      commandId: message.commandId,
      message: "Reconnect the display before sending a command.",
    });
    return;
  }

  try {
    if (message.command.type === "CAPTURE") {
      await runCapture(message.command, message.actor, message.commandId);
    } else if (
      message.command.type === "START_CAPTURE_SEQUENCE" ||
      message.command.type === "RETAKE"
    ) {
      commit(
        reduceCommand(state, message.command, message.actor),
        message.actor,
        message.command,
        message.commandId,
      );
      scheduleCountdownStep();
    } else if (message.command.type === "APPROVE") {
      await runApproval(message.command, message.actor, message.commandId);
    } else if (message.command.type === "DELETE_EVENT") {
      await runDeleteEvent(message.command, message.actor, message.commandId);
    } else if (message.command.type === "RETRY_QR_DELIVERY") {
      commit(
        reduceCommand(state, message.command, message.actor),
        message.actor,
        message.command,
        message.commandId,
      );
      scheduleDeliveryQueue(100);
    } else {
      commit(
        reduceCommand(state, message.command, message.actor),
        message.actor,
        message.command,
        message.commandId,
      );
    }
    send(socket, { type: "ACK", commandId: message.commandId });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "The command failed.";
    const isExpected = error instanceof CommandError;
    if (!isExpected && ["capturing", "processing"].includes(state.phase)) {
      systemCommit({ type: "FAIL", message: messageText });
    }
    send(socket, { type: "ERROR", commandId: message.commandId, message: messageText });
  }
};

socketServer.on("connection", (socket) => {
  send(socket, { type: "STATE", state });
  socket.on("message", (rawData) => {
    commandQueue = commandQueue
      .then(() => processMessage(socket, rawData))
      .catch((error) => console.error("Command queue failed:", error));
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`WanderBooth Host is ready on http://0.0.0.0:${port}`);
  console.log(`Runtime data stays local in ${dataDirectory}`);
  if (state.phase === "countdown") scheduleCountdownStep();
  scheduleDeliveryQueue(750);
});
