import { getDesign, getLayout, getProduct } from "./catalog.js";

export type Actor = "owner" | "attendant" | "customer" | "system";
export type OperationMode = "attendant" | "self_service";
export type CameraSourceId = "simulator" | "macbook_camera";
export type Phase =
  | "idle"
  | "selecting"
  | "awaiting_cash"
  | "ready"
  | "countdown"
  | "capturing"
  | "reviewing"
  | "processing"
  | "complete"
  | "error";

export type Capture = {
  slot: number;
  revision: number;
  mediaUrl: string;
  capturedAt: string;
};

export type PendingCapture = {
  kind: "capture" | "retake";
  slot: number;
  revision: number;
};

export type CaptureSequence =
  | { kind: "initial"; remaining: number }
  | { kind: "retake"; remaining: number; slot: number };

export type Deliverable = {
  kind: "individual" | "strip" | "slideshow";
  label: string;
  mediaUrl: string;
  mimeType: string;
};

export type BoothState = {
  schemaVersion: 3;
  revision: number;
  operationMode: OperationMode;
  cameraSourceId: CameraSourceId;
  phase: Phase;
  sessionId: string | null;
  productId: string | null;
  layoutId: string | null;
  designId: string | null;
  requiredCaptureCount: number;
  captures: Capture[];
  pendingCapture: PendingCapture | null;
  captureSequence: CaptureSequence | null;
  retakesRemaining: number;
  cashConfirmed: boolean;
  consentRecorded: boolean;
  deliverables: Deliverable[];
  updatedAt: string;
  lastError: string | null;
};

export type Command =
  | { type: "SET_MODE"; mode: OperationMode }
  | { type: "SET_CAMERA_SOURCE"; cameraSourceId: CameraSourceId }
  | { type: "BEGIN_SESSION"; sessionId: string }
  | { type: "SELECT_PRODUCT"; productId: string }
  | { type: "SELECT_LAYOUT"; layoutId: string }
  | { type: "SELECT_DESIGN"; designId: string }
  | { type: "RECORD_CONSENT" }
  | { type: "SUBMIT_SELECTION" }
  | { type: "CONFIRM_CASH" }
  | { type: "START_CAPTURE_SEQUENCE" }
  | { type: "CAPTURE" }
  | { type: "CAPTURE_COMPLETED"; capture: Capture }
  | { type: "RETAKE"; slot: number }
  | { type: "RETAKE_COMPLETED"; capture: Capture }
  | { type: "COUNTDOWN_TICK"; remaining: number }
  | { type: "COUNTDOWN_TRIGGER" }
  | { type: "CAMERA_CAPTURE_FAILED"; message: string }
  | { type: "APPROVE" }
  | { type: "PROCESSING_STARTED" }
  | { type: "PROCESSING_COMPLETED"; deliverables: Deliverable[] }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

const now = () => new Date().toISOString();
const isStaff = (actor: Actor) => actor === "owner" || actor === "attendant";

export const initialBoothState = (): BoothState => ({
  schemaVersion: 3,
  revision: 0,
  operationMode: "attendant",
  cameraSourceId: "simulator",
  phase: "idle",
  sessionId: null,
  productId: null,
  layoutId: null,
  designId: null,
  requiredCaptureCount: 0,
  captures: [],
  pendingCapture: null,
  captureSequence: null,
  retakesRemaining: 2,
  cashConfirmed: false,
  consentRecorded: false,
  deliverables: [],
  updatedAt: now(),
  lastError: null,
});

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

const canControlCreativeFlow = (state: BoothState, actor: Actor) =>
  state.operationMode === "attendant" ? isStaff(actor) : actor === "customer" || isStaff(actor);

const requirePhase = (state: BoothState, phases: Phase[]) => {
  if (!phases.includes(state.phase)) {
    throw new CommandError(`Action is not available while the booth is ${state.phase}.`);
  }
};

export function assertCommandAllowed(state: BoothState, command: Command, actor: Actor) {
  switch (command.type) {
    case "SET_MODE":
      if (!isStaff(actor)) throw new CommandError("Only staff can change operation mode.");
      requirePhase(state, ["idle"]);
      return;
    case "SET_CAMERA_SOURCE":
      if (!isStaff(actor)) throw new CommandError("Only staff can choose the camera source.");
      requirePhase(state, ["idle"]);
      return;
    case "RESET":
    case "CONFIRM_CASH":
    case "CAMERA_CAPTURE_FAILED":
      if (!isStaff(actor)) throw new CommandError("This action is staff-only.");
      return;
    case "BEGIN_SESSION":
    case "SELECT_PRODUCT":
    case "SELECT_LAYOUT":
    case "SELECT_DESIGN":
    case "RECORD_CONSENT":
    case "SUBMIT_SELECTION":
    case "START_CAPTURE_SEQUENCE":
    case "CAPTURE":
    case "RETAKE":
    case "APPROVE":
      if (!canControlCreativeFlow(state, actor)) {
        throw new CommandError("The customer display is read-only in Attendant-Operated mode.");
      }
      return;
    case "CAPTURE_COMPLETED":
    case "RETAKE_COMPLETED":
    case "COUNTDOWN_TICK":
    case "COUNTDOWN_TRIGGER":
    case "PROCESSING_STARTED":
    case "PROCESSING_COMPLETED":
    case "FAIL":
      if (actor !== "system") throw new CommandError("Only the Host can complete this action.");
      return;
  }
}

const revised = (state: BoothState, patch: Partial<BoothState>): BoothState => ({
  ...state,
  ...patch,
  revision: state.revision + 1,
  updatedAt: now(),
  lastError: patch.lastError === undefined ? null : patch.lastError,
});

export function reduceCommand(state: BoothState, command: Command, actor: Actor): BoothState {
  assertCommandAllowed(state, command, actor);

  switch (command.type) {
    case "SET_MODE":
      return revised(state, { operationMode: command.mode });
    case "SET_CAMERA_SOURCE":
      return revised(state, { cameraSourceId: command.cameraSourceId });
    case "BEGIN_SESSION":
      requirePhase(state, ["idle"]);
      return revised(state, {
        phase: "selecting",
        sessionId: command.sessionId,
        productId: null,
        layoutId: null,
        designId: null,
        requiredCaptureCount: 0,
        captures: [],
        pendingCapture: null,
        captureSequence: null,
        retakesRemaining: 2,
        cashConfirmed: false,
        consentRecorded: false,
        deliverables: [],
      });
    case "SELECT_PRODUCT": {
      requirePhase(state, ["selecting"]);
      const product = getProduct(command.productId);
      if (!product) throw new CommandError("That product is not available.");
      return revised(state, {
        productId: product.id,
        layoutId: null,
        designId: null,
        requiredCaptureCount: 0,
      });
    }
    case "SELECT_LAYOUT": {
      requirePhase(state, ["selecting"]);
      const product = getProduct(state.productId);
      const layout = getLayout(command.layoutId);
      if (!product || !layout || !product.layoutIds.includes(layout.id)) {
        throw new CommandError("That layout is not compatible with the selected product.");
      }
      return revised(state, {
        layoutId: layout.id,
        requiredCaptureCount: layout.requiredCaptureCount,
      });
    }
    case "SELECT_DESIGN": {
      requirePhase(state, ["selecting", "reviewing"]);
      if (!getDesign(command.designId)) throw new CommandError("That design is not available.");
      return revised(state, { designId: command.designId });
    }
    case "RECORD_CONSENT":
      requirePhase(state, ["selecting"]);
      return revised(state, { consentRecorded: true });
    case "SUBMIT_SELECTION":
      requirePhase(state, ["selecting"]);
      if (!state.productId || !state.layoutId || !state.designId || !state.consentRecorded) {
        throw new CommandError("Complete the product, layout, design, and consent steps first.");
      }
      return revised(state, { phase: "awaiting_cash" });
    case "CONFIRM_CASH":
      requirePhase(state, ["awaiting_cash"]);
      return revised(state, { phase: "ready", cashConfirmed: true });
    case "START_CAPTURE_SEQUENCE":
      requirePhase(state, ["ready"]);
      if (state.captures.length >= state.requiredCaptureCount) {
        throw new CommandError("All required photos have already been captured.");
      }
      return revised(state, {
        phase: "countdown",
        captureSequence: { kind: "initial", remaining: 3 },
      });
    case "CAPTURE":
      requirePhase(state, ["ready"]);
      if (state.captures.length >= state.requiredCaptureCount) {
        throw new CommandError("All required photos have already been captured.");
      }
      if (state.pendingCapture) throw new CommandError("A photo is already being captured.");
      return revised(state, {
        phase: "capturing",
        pendingCapture: {
          kind: "capture",
          slot: state.captures.length + 1,
          revision: 1,
        },
      });
    case "CAPTURE_COMPLETED": {
      requirePhase(state, ["capturing"]);
      if (
        state.pendingCapture?.kind !== "capture" ||
        state.pendingCapture.slot !== command.capture.slot ||
        state.pendingCapture.revision !== command.capture.revision
      ) {
        throw new CommandError("The completed photo does not match the pending capture.");
      }
      const captures = [
        ...state.captures.filter((item) => item.slot !== command.capture.slot),
        command.capture,
      ].sort((a, b) => a.slot - b.slot);
      return revised(state, {
        captures,
        pendingCapture: null,
        captureSequence:
          state.captureSequence?.kind === "initial" && captures.length < state.requiredCaptureCount
            ? { kind: "initial", remaining: 3 }
            : null,
        phase:
          captures.length >= state.requiredCaptureCount
            ? "reviewing"
            : state.captureSequence?.kind === "initial"
              ? "countdown"
              : "ready",
      });
    }
    case "RETAKE": {
      requirePhase(state, ["reviewing"]);
      if (state.retakesRemaining <= 0) throw new CommandError("No retakes remain.");
      if (!state.captures.some((capture) => capture.slot === command.slot)) {
        throw new CommandError("Choose an existing photo to replace.");
      }
      return revised(state, {
        phase: "countdown",
        captureSequence: {
          kind: "retake",
          remaining: 3,
          slot: command.slot,
        },
      });
    }
    case "RETAKE_COMPLETED": {
      requirePhase(state, ["capturing"]);
      if (
        state.pendingCapture?.kind !== "retake" ||
        state.pendingCapture.slot !== command.capture.slot ||
        state.pendingCapture.revision !== command.capture.revision
      ) {
        throw new CommandError("The completed photo does not match the pending retake.");
      }
      const captures = [
        ...state.captures.filter((item) => item.slot !== command.capture.slot),
        command.capture,
      ].sort((a, b) => a.slot - b.slot);
      return revised(state, {
        captures,
        pendingCapture: null,
        captureSequence: null,
        retakesRemaining: state.retakesRemaining - 1,
        phase: "reviewing",
      });
    }
    case "COUNTDOWN_TICK":
      requirePhase(state, ["countdown"]);
      if (!state.captureSequence || command.remaining !== state.captureSequence.remaining - 1) {
        throw new CommandError("The countdown update is out of sequence.");
      }
      if (command.remaining < 1) throw new CommandError("The countdown cannot go below one.");
      return revised(state, {
        captureSequence: { ...state.captureSequence, remaining: command.remaining },
      });
    case "COUNTDOWN_TRIGGER": {
      requirePhase(state, ["countdown"]);
      if (state.captureSequence?.remaining !== 1) {
        throw new CommandError("The countdown is not ready to capture.");
      }

      const isRetake = state.captureSequence.kind === "retake";
      const slot =
        state.captureSequence.kind === "retake"
          ? state.captureSequence.slot
          : state.captures.length + 1;
      const original = state.captures.find((capture) => capture.slot === slot);
      return revised(state, {
        phase: "capturing",
        pendingCapture: {
          kind: isRetake ? "retake" : "capture",
          slot,
          revision: isRetake ? (original?.revision ?? 0) + 1 : 1,
        },
      });
    }
    case "CAMERA_CAPTURE_FAILED":
      requirePhase(state, ["capturing"]);
      return revised(state, {
        phase: "error",
        pendingCapture: null,
        captureSequence: null,
        lastError: command.message,
      });
    case "APPROVE":
      requirePhase(state, ["reviewing"]);
      if (state.captures.length !== state.requiredCaptureCount) {
        throw new CommandError("The session does not have every required photo.");
      }
      return revised(state, { phase: "processing" });
    case "PROCESSING_STARTED":
      requirePhase(state, ["processing"]);
      return revised(state, { phase: "processing" });
    case "PROCESSING_COMPLETED":
      requirePhase(state, ["processing"]);
      return revised(state, { phase: "complete", deliverables: command.deliverables });
    case "FAIL":
      return revised(state, {
        phase: "error",
        pendingCapture: null,
        captureSequence: null,
        lastError: command.message,
      });
    case "RESET":
      return {
        ...initialBoothState(),
        operationMode: state.operationMode,
        cameraSourceId: state.cameraSourceId,
        revision: state.revision + 1,
        updatedAt: now(),
      };
  }
}

export const controllerActorFor = (state: BoothState): Actor =>
  state.operationMode === "attendant" ? "attendant" : "customer";
