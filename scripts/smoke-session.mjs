import WebSocket from "ws";

const hostPort = process.env.WANDERBOOTH_SMOKE_HOST_PORT ?? "4174";
const socket = new WebSocket(`ws://127.0.0.1:${hostPort}/ws`);
const clientId = `smoke-${crypto.randomUUID()}`;
const acknowledgements = new Map();
const stateWaiters = new Set();
let currentState;

const productId = process.env.WANDERBOOTH_SMOKE_PRODUCT_ID ?? "three-photo-strip";
const layoutId = process.env.WANDERBOOTH_SMOKE_LAYOUT_ID ?? "double-strip-4x6";
const designId = process.env.WANDERBOOTH_SMOKE_DESIGN_ID ?? "wander-splash";
const overlayId = process.env.WANDERBOOTH_SMOKE_OVERLAY_ID ?? "film-edge";

const waitForState = (predicate, label, timeoutMs = 15_000) => {
  if (currentState && predicate(currentState)) return Promise.resolve(currentState);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      stateWaiters.delete(waiter);
      reject(new Error(`Timed out waiting for ${label}.`));
    }, timeoutMs);
    const waiter = { predicate, resolve, timeout };
    stateWaiters.add(waiter);
  });
};

socket.on("message", (rawData) => {
  const message = JSON.parse(rawData.toString());
  if (message.type === "STATE") {
    currentState = message.state;
    for (const waiter of stateWaiters) {
      if (waiter.predicate(currentState)) {
        clearTimeout(waiter.timeout);
        stateWaiters.delete(waiter);
        waiter.resolve(currentState);
      }
    }
  }
  if (message.type === "ACK") {
    acknowledgements.get(message.commandId)?.resolve();
    acknowledgements.delete(message.commandId);
  }
  if (message.type === "ERROR" && message.commandId) {
    acknowledgements.get(message.commandId)?.reject(new Error(message.message));
    acknowledgements.delete(message.commandId);
  }
});

await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

socket.send(JSON.stringify({ type: "HELLO", actor: "attendant", clientId }));
await waitForState(() => true, "initial state");

if (currentState.phase !== "idle") {
  throw new Error(`Smoke test requires an idle booth; current phase is ${currentState.phase}.`);
}

const command = (payload) =>
  new Promise((resolve, reject) => {
    const commandId = crypto.randomUUID();
    acknowledgements.set(commandId, { resolve, reject });
    socket.send(
      JSON.stringify({
        type: "COMMAND",
        actor: "attendant",
        clientId,
        commandId,
        command: payload,
      }),
    );
  });

if (currentState.cameraSourceId !== "simulator") {
  await command({ type: "SET_CAMERA_SOURCE", cameraSourceId: "simulator" });
}

if (!currentState.activeEventId) {
  const smokeEventId = `event-smoke-${Date.now()}`;
  await command({
    type: "CREATE_EVENT",
    eventId: smokeEventId,
    name: "Synthetic smoke-test event",
    eventDate: new Date().toISOString().slice(0, 10),
    templateFolderId: currentState.templateFolders[0].id,
  });
}

await command({ type: "BEGIN_SESSION", sessionId: `smoke-${Date.now()}` });
await command({ type: "SELECT_PRODUCT", productId });
await command({ type: "SELECT_LAYOUT", layoutId });
await command({ type: "SELECT_DESIGN", designId });
await command({ type: "SELECT_OVERLAY", overlayId });
await command({ type: "RECORD_CONSENT" });
await command({ type: "SUBMIT_SELECTION" });
await command({ type: "CONFIRM_CASH" });

const requiredCaptureCount = currentState.requiredCaptureCount;

await command({ type: "START_CAPTURE_SEQUENCE" });
await waitForState(
  (state) => state.phase === "reviewing" && state.captures.length === requiredCaptureCount,
  `automatic ${requiredCaptureCount}-photo sequence`,
  40_000,
);

await command({ type: "APPROVE" });
const completed = await waitForState((state) => state.phase === "complete", "deliverables", 30_000);

const kinds = completed.deliverables.map((item) => item.kind);
if (completed.captures.length !== requiredCaptureCount) {
  throw new Error(`Expected ${requiredCaptureCount} captures.`);
}
if (
  completed.deliverables.filter((item) => item.kind === "individual").length !==
  requiredCaptureCount
) {
  throw new Error(`Expected ${requiredCaptureCount} branded individual files.`);
}
if (!kinds.includes("strip")) throw new Error("Expected a rendered strip.");
if (!kinds.includes("print")) throw new Error("Expected a 4×6 print sheet.");
if (!kinds.includes("slideshow")) throw new Error("Expected a rendered slideshow.");

const completedEvent = completed.events.find((event) => event.id === completed.activeEventId);
const completedSession = completedEvent?.sessions.find(
  (session) => session.id === completed.sessionId,
);
if (!completedSession?.qrDelivery?.token) {
  throw new Error("Expected a persistent private QR delivery record.");
}

if (process.env.WANDERBOOTH_SMOKE_EXPECT_QR_READY === "1") {
  await waitForState(
    (state) => {
      const event = state.events.find((item) => item.id === state.activeEventId);
      return (
        event?.sessions.find((session) => session.id === state.sessionId)?.qrDelivery.status ===
        "ready"
      );
    },
    "cloud QR delivery",
    60_000,
  );
}

console.log("Smoke session passed:");
for (const deliverable of completed.deliverables) {
  console.log(`- ${deliverable.label}: ${deliverable.mediaUrl}`);
}
console.log(`- QR delivery: ${completedSession.qrDelivery.shareUrl ?? "cloud setup required"}`);

if (process.env.WANDERBOOTH_SMOKE_KEEP_COMPLETE !== "1") {
  await command({ type: "RESET" });
}
socket.close();
