import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, resolve } from "node:path";

import WebSocket, { WebSocketServer } from "ws";

import { takeSimulatedPhoto } from "../camera/simulator.js";
import {
  type CustomOverlayMode,
  getLayout,
  getOverlay,
  identityMediaTransform,
} from "../shared/catalog.js";
import type { ClientMessage, ServerMessage } from "../shared/protocol.js";
import {
  type Actor,
  type BoothState,
  type Command,
  CommandError,
  initialBoothState,
  reduceCommand,
} from "../shared/session.js";
import { importCustomOverlay } from "./customOverlay.js";
import { BoothDatabase } from "./database.js";
import { buildDeliverables } from "./deliverables.js";

const port = Number(process.env.WANDERBOOTH_HOST_PORT ?? 4174);
const dataDirectory = resolve(process.env.WANDERBOOTH_DATA_DIR ?? "data/runtime");
const webDirectory = process.env.WANDERBOOTH_WEB_DIR
  ? resolve(process.env.WANDERBOOTH_WEB_DIR)
  : null;
await mkdir(dataDirectory, { recursive: true });

const database = new BoothDatabase(dataDirectory);
const defaultState = initialBoothState();
const savedState = database.loadState();
const savedCustomOverlays = savedState?.customOverlays ?? [];
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
      schemaVersion: 6,
      cameraSourceId: savedState.cameraSourceId ?? "simulator",
      pendingCapture: savedState.pendingCapture ?? null,
      captureSequence: savedState.captureSequence ?? null,
      overlayId: savedState.overlayId ?? "none",
      customOverlays: savedCustomOverlays,
      frameMode: savedFrameMode,
      designId: savedFrameMode === "custom" ? null : savedState.designId,
      frameTransform: savedState.frameTransform ?? identityMediaTransform(),
      photoTransforms: savedState.photoTransforms ?? [],
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
  const body = await readImageBody(request);
  const captureDirectory = resolve(dataDirectory, "sessions", sessionId, "captures");
  await mkdir(captureDirectory, { recursive: true });
  const filename = `photo-${pending.slot}-r${pending.revision}.jpg`;
  await writeFile(resolve(captureDirectory, filename), body);

  systemCommit({
    type: pending.kind === "retake" ? "RETAKE_COMPLETED" : "CAPTURE_COMPLETED",
    capture: {
      slot: pending.slot,
      revision: pending.revision,
      mediaUrl: `/media/sessions/${sessionId}/captures/${filename}`,
      capturedAt: new Date().toISOString(),
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
  if (!["idle", "selecting", "reviewing"].includes(state.phase)) {
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

const httpServer = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers":
        "Content-Type, X-Session-Id, X-WanderBooth-Layout-Id, X-WanderBooth-Overlay-Mode, X-WanderBooth-Overlay-Name",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    response.end();
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

const safeSessionId = (sessionId: string) => {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) {
    throw new CommandError("The session identifier is invalid.");
  }
  return sessionId;
};

const runSimulatorPendingCapture = async (sessionId: string) => {
  const pending = state.pendingCapture;
  if (!pending) throw new CommandError("The simulator capture was not scheduled.");
  const result = await takeSimulatedPhoto({
    dataDirectory,
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
  systemCommit({ type: "PROCESSING_COMPLETED", deliverables });
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
});
