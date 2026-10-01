import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, resolve } from "node:path";

import WebSocket, { WebSocketServer } from "ws";

import { takeSimulatedPhoto } from "../camera/simulator.js";
import type { ClientMessage, ServerMessage } from "../shared/protocol.js";
import {
  type Actor,
  type BoothState,
  type Command,
  CommandError,
  initialBoothState,
  reduceCommand,
} from "../shared/session.js";
import { BoothDatabase } from "./database.js";
import { buildDeliverables } from "./deliverables.js";

const port = Number(process.env.WANDERBOOTH_HOST_PORT ?? 4174);
const dataDirectory = resolve(process.env.WANDERBOOTH_DATA_DIR ?? "data/runtime");
await mkdir(dataDirectory, { recursive: true });

const database = new BoothDatabase(dataDirectory);
let state: BoothState = database.loadState() ?? initialBoothState();
database.saveState(state);

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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

const httpServer = createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    response.end();
    return;
  }

  if (request.url === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "wanderbooth-host",
      phase: state.phase,
      revision: state.revision,
    });
    return;
  }

  if (request.url === "/api/state") {
    sendJson(response, 200, state);
    return;
  }

  if (request.url?.startsWith("/media/")) {
    const relativePath = decodeURIComponent(request.url.slice("/media/".length)).replaceAll(
      "\\",
      "/",
    );
    const absolutePath = resolve(dataDirectory, relativePath);
    const safeRoot = `${dataDirectory}/`;
    if (!absolutePath.startsWith(safeRoot) || !existsSync(absolutePath)) {
      sendJson(response, 404, { error: "Media not found." });
      return;
    }

    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type":
        contentTypes[extname(absolutePath).toLowerCase()] ?? "application/octet-stream",
    });
    createReadStream(absolutePath).pipe(response);
    return;
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

const runCapture = async (
  command: Extract<Command, { type: "CAPTURE" }>,
  actor: Actor,
  id: string,
) => {
  const sessionId = safeSessionId(state.sessionId ?? "");
  commit(reduceCommand(state, command, actor), actor, command, id);
  const slot = state.captures.length + 1;
  const result = await takeSimulatedPhoto({
    dataDirectory,
    sessionId,
    slot,
    revision: 1,
  });
  systemCommit({
    type: "CAPTURE_COMPLETED",
    capture: {
      slot,
      revision: 1,
      mediaUrl: result.mediaUrl,
      capturedAt: result.capturedAt,
    },
  });
};

const runRetake = async (
  command: Extract<Command, { type: "RETAKE" }>,
  actor: Actor,
  id: string,
) => {
  const sessionId = safeSessionId(state.sessionId ?? "");
  const original = state.captures.find((capture) => capture.slot === command.slot);
  commit(reduceCommand(state, command, actor), actor, command, id);
  const revision = (original?.revision ?? 0) + 1;
  const result = await takeSimulatedPhoto({
    dataDirectory,
    sessionId,
    slot: command.slot,
    revision,
  });
  systemCommit({
    type: "RETAKE_COMPLETED",
    capture: {
      slot: command.slot,
      revision,
      mediaUrl: result.mediaUrl,
      capturedAt: result.capturedAt,
    },
  });
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

let commandQueue = Promise.resolve();

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
    } else if (message.command.type === "RETAKE") {
      await runRetake(message.command, message.actor, message.commandId);
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
});
