import WebSocket from "ws";

const socket = new WebSocket("ws://127.0.0.1:4174/ws");
const clientId = `smoke-${crypto.randomUUID()}`;
const acknowledgements = new Map();
const stateWaiters = new Set();
let currentState;

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

await command({ type: "BEGIN_SESSION", sessionId: `smoke-${Date.now()}` });
await command({ type: "SELECT_PRODUCT", productId: "three-photo-strip" });
await command({ type: "SELECT_LAYOUT", layoutId: "vertical-2x6" });
await command({ type: "SELECT_DESIGN", designId: "wander-splash" });
await command({ type: "RECORD_CONSENT" });
await command({ type: "SUBMIT_SELECTION" });
await command({ type: "CONFIRM_CASH" });

for (let slot = 1; slot <= 3; slot += 1) {
  await command({ type: "CAPTURE" });
  await waitForState((state) => state.captures.length === slot, `capture ${slot}`);
}

await command({ type: "APPROVE" });
const completed = await waitForState((state) => state.phase === "complete", "deliverables", 30_000);

const kinds = completed.deliverables.map((item) => item.kind);
if (completed.captures.length !== 3) throw new Error("Expected three captures.");
if (completed.deliverables.filter((item) => item.kind === "individual").length !== 3) {
  throw new Error("Expected three branded individual files.");
}
if (!kinds.includes("strip")) throw new Error("Expected a rendered strip.");
if (!kinds.includes("slideshow")) throw new Error("Expected a rendered slideshow.");

console.log("Smoke session passed:");
for (const deliverable of completed.deliverables) {
  console.log(`- ${deliverable.label}: ${deliverable.mediaUrl}`);
}

await command({ type: "RESET" });
socket.close();
