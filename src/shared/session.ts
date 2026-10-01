import {
  type CustomOverlay,
  captureCountForSlots,
  getDesign,
  getLayout,
  getOverlay,
  getProduct,
  identityMediaTransform,
  isCustomLayoutId,
  MAX_CUSTOM_HOLDERS,
  type MediaTransform,
  normalizePhotoTransform,
  overlaySupportsLayout,
  type PhotoSlot,
  photoSlotId,
  resolveLayout,
} from "./catalog.js";

export type Actor = "owner" | "attendant" | "customer" | "system";
export type OperationMode = "attendant" | "self_service";
export type CameraSourceId = "simulator" | "macbook_camera";
export type FrameMode = "color" | "custom";
export type Phase =
  | "idle"
  | "template_gallery"
  | "template_editing"
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

export type PhotoTransform = MediaTransform & { slot: number; holderId?: string };
export type HolderTransform = MediaTransform & { slot: number; holderId?: string };

export type SavedTemplate = {
  id: string;
  name: string;
  productId: string;
  layoutId: string;
  overlayId: string;
  customSlots: PhotoSlot[] | null;
  frameTransform: MediaTransform;
  holderTransforms: HolderTransform[];
  photoTransforms: PhotoTransform[];
  approved: true;
  createdAt: string;
  updatedAt: string;
};

export type TemplateEditorState = {
  sourceTemplateId: string | null;
  startingName: string;
};

export type BoothState = {
  schemaVersion: 11;
  revision: number;
  operationMode: OperationMode;
  cameraSourceId: CameraSourceId;
  phase: Phase;
  sessionId: string | null;
  productId: string | null;
  layoutId: string | null;
  frameMode: FrameMode | null;
  designId: string | null;
  overlayId: string;
  customOverlays: CustomOverlay[];
  savedTemplates: SavedTemplate[];
  selectedTemplateId: string | null;
  templateEditor: TemplateEditorState | null;
  customSlots: PhotoSlot[] | null;
  frameTransform: MediaTransform;
  holderTransforms: HolderTransform[];
  photoTransforms: PhotoTransform[];
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
  | { type: "OPEN_TEMPLATE_GALLERY" }
  | { type: "CLOSE_TEMPLATE_GALLERY" }
  | {
      type: "BEGIN_TEMPLATE_CREATE";
      name: string;
      productId: string;
      layoutId: string;
      overlayId: string;
      initialHolderId?: string;
    }
  | { type: "BEGIN_TEMPLATE_EDIT"; templateId: string }
  | { type: "SAVE_TEMPLATE"; templateId: string; name: string }
  | { type: "CANCEL_TEMPLATE_EDIT" }
  | { type: "DELETE_TEMPLATE"; templateId: string }
  | { type: "ADD_TEMPLATE_HOLDER"; holderId: string }
  | { type: "REMOVE_TEMPLATE_HOLDER"; holderId: string }
  | { type: "SET_TEMPLATE_HOLDER_CAPTURE"; holderId: string; captureSlot: number }
  | { type: "BEGIN_SESSION"; sessionId: string }
  | { type: "SELECT_TEMPLATE"; templateId: string }
  | { type: "SELECT_PRODUCT"; productId: string }
  | { type: "SELECT_LAYOUT"; layoutId: string }
  | { type: "SELECT_FRAME_MODE"; frameMode: FrameMode }
  | { type: "SELECT_DESIGN"; designId: string }
  | { type: "SELECT_OVERLAY"; overlayId: string }
  | { type: "UPDATE_FRAME_TRANSFORM"; transform: MediaTransform }
  | {
      type: "UPDATE_HOLDER_TRANSFORM";
      slot: number;
      holderId?: string;
      transform: MediaTransform;
    }
  | {
      type: "UPDATE_PHOTO_TRANSFORM";
      slot: number;
      holderId?: string;
      transform: MediaTransform;
    }
  | { type: "REGISTER_CUSTOM_OVERLAY"; overlay: CustomOverlay }
  | { type: "DELETE_CUSTOM_OVERLAY"; overlayId: string }
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
  schemaVersion: 11,
  revision: 0,
  operationMode: "attendant",
  cameraSourceId: "simulator",
  phase: "idle",
  sessionId: null,
  productId: null,
  layoutId: null,
  frameMode: null,
  designId: null,
  overlayId: "none",
  customOverlays: [],
  savedTemplates: [],
  selectedTemplateId: null,
  templateEditor: null,
  customSlots: null,
  frameTransform: identityMediaTransform(),
  holderTransforms: [],
  photoTransforms: [],
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

const assertMediaTransform = (transform: MediaTransform) => {
  if (
    ![
      transform.offsetX,
      transform.offsetY,
      transform.scaleX,
      transform.scaleY,
      transform.rotation,
    ].every(Number.isFinite) ||
    Math.abs(transform.offsetX) > 1 ||
    Math.abs(transform.offsetY) > 1 ||
    transform.scaleX < 0.2 ||
    transform.scaleX > 4 ||
    transform.scaleY < 0.2 ||
    transform.scaleY > 4 ||
    Math.abs(transform.rotation) > 180 ||
    typeof transform.locked !== "boolean"
  ) {
    throw new CommandError("That frame or photo adjustment is outside the supported range.");
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
    case "OPEN_TEMPLATE_GALLERY":
    case "CLOSE_TEMPLATE_GALLERY":
    case "BEGIN_TEMPLATE_CREATE":
    case "BEGIN_TEMPLATE_EDIT":
    case "SAVE_TEMPLATE":
    case "CANCEL_TEMPLATE_EDIT":
    case "DELETE_TEMPLATE":
    case "ADD_TEMPLATE_HOLDER":
    case "REMOVE_TEMPLATE_HOLDER":
    case "SET_TEMPLATE_HOLDER_CAPTURE":
    case "RESET":
    case "CONFIRM_CASH":
    case "CAMERA_CAPTURE_FAILED":
    case "UPDATE_FRAME_TRANSFORM":
    case "UPDATE_HOLDER_TRANSFORM":
    case "UPDATE_PHOTO_TRANSFORM":
      if (!isStaff(actor)) throw new CommandError("This action is staff-only.");
      return;
    case "BEGIN_SESSION":
    case "SELECT_TEMPLATE":
    case "SELECT_PRODUCT":
    case "SELECT_LAYOUT":
    case "SELECT_FRAME_MODE":
    case "SELECT_DESIGN":
    case "SELECT_OVERLAY":
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
    case "REGISTER_CUSTOM_OVERLAY":
    case "DELETE_CUSTOM_OVERLAY":
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

const validatedTemplateName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new CommandError("Use a template name between 1 and 80 characters.");
  }
  return trimmed;
};

const defaultCustomSlot = (layoutId: string, holderId: string, index: number): PhotoSlot => {
  const layout = getLayout(layoutId);
  if (!layout || !isCustomLayoutId(layout.id)) {
    throw new CommandError("Choose a custom portrait or landscape layout first.");
  }
  if (!holderId.trim() || holderId.length > 100) {
    throw new CommandError("The photo holder identifier is invalid.");
  }
  const width = Math.round(layout.canvasWidth * 0.42);
  const height = Math.round(layout.canvasHeight * 0.24);
  const columns = layout.canvasWidth > layout.canvasHeight ? 3 : 2;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = Math.round(
    layout.canvasWidth * 0.08 + column * Math.min(width * 0.72, layout.canvasWidth * 0.25),
  );
  const y = Math.round(
    layout.canvasHeight * 0.1 + row * Math.min(height * 0.78, layout.canvasHeight * 0.22),
  );
  return {
    id: holderId,
    captureIndex: Math.min(index, MAX_CUSTOM_HOLDERS - 1),
    x,
    y,
    width,
    height,
    shape: "rectangle",
  };
};

const normalizeCaptureLabels = (slots: PhotoSlot[]): PhotoSlot[] => {
  const labels = [...new Set(slots.map((slot) => slot.captureIndex))].sort((a, b) => a - b);
  const normalized = new Map(labels.map((label, index) => [label, index]));
  return slots.map((slot) => ({
    ...slot,
    captureIndex: normalized.get(slot.captureIndex) ?? 0,
  }));
};

const stateLayout = (state: BoothState) => resolveLayout(state.layoutId, state.customSlots);

const holderMatches = (item: HolderTransform | PhotoTransform, holderId: string, slot: number) =>
  item.holderId ? item.holderId === holderId : item.slot === slot;

const clearedWorkspace = (): Partial<BoothState> => ({
  sessionId: null,
  productId: null,
  layoutId: null,
  frameMode: null,
  designId: null,
  overlayId: "none",
  selectedTemplateId: null,
  templateEditor: null,
  customSlots: null,
  frameTransform: identityMediaTransform(),
  holderTransforms: [],
  photoTransforms: [],
  requiredCaptureCount: 0,
  captures: [],
  pendingCapture: null,
  captureSequence: null,
  retakesRemaining: 2,
  cashConfirmed: false,
  consentRecorded: false,
  deliverables: [],
});

export function reduceCommand(state: BoothState, command: Command, actor: Actor): BoothState {
  assertCommandAllowed(state, command, actor);

  switch (command.type) {
    case "SET_MODE":
      return revised(state, { operationMode: command.mode });
    case "SET_CAMERA_SOURCE":
      return revised(state, { cameraSourceId: command.cameraSourceId });
    case "OPEN_TEMPLATE_GALLERY":
      requirePhase(state, ["idle"]);
      return revised(state, { ...clearedWorkspace(), phase: "template_gallery" });
    case "CLOSE_TEMPLATE_GALLERY":
      requirePhase(state, ["template_gallery"]);
      return revised(state, { ...clearedWorkspace(), phase: "idle" });
    case "BEGIN_TEMPLATE_CREATE": {
      requirePhase(state, ["template_gallery"]);
      const name = validatedTemplateName(command.name);
      const product = getProduct(command.productId);
      const layout = getLayout(command.layoutId);
      const overlay = getOverlay(command.overlayId, state.customOverlays);
      if (!product || !layout || !product.layoutIds.includes(layout.id)) {
        throw new CommandError("Choose a valid product and layout for this template.");
      }
      if (overlay?.kind !== "custom" || !overlaySupportsLayout(overlay, layout.id)) {
        throw new CommandError("Choose imported artwork made for this layout.");
      }
      const customSlots = isCustomLayoutId(layout.id)
        ? [defaultCustomSlot(layout.id, command.initialHolderId ?? "", 0)]
        : null;
      return revised(state, {
        ...clearedWorkspace(),
        phase: "template_editing",
        productId: product.id,
        layoutId: layout.id,
        customSlots,
        requiredCaptureCount: customSlots
          ? captureCountForSlots(customSlots)
          : layout.requiredCaptureCount,
        frameMode: "custom",
        overlayId: overlay.id,
        templateEditor: { sourceTemplateId: null, startingName: name },
      });
    }
    case "BEGIN_TEMPLATE_EDIT": {
      requirePhase(state, ["template_gallery"]);
      const template = state.savedTemplates.find((item) => item.id === command.templateId);
      if (!template) throw new CommandError("That saved template is no longer available.");
      const layout = getLayout(template.layoutId);
      const product = getProduct(template.productId);
      const overlay = getOverlay(template.overlayId, state.customOverlays);
      if (!layout || !product?.layoutIds.includes(layout.id) || overlay?.kind !== "custom") {
        throw new CommandError("That template is missing its layout or imported artwork.");
      }
      return revised(state, {
        ...clearedWorkspace(),
        phase: "template_editing",
        productId: product.id,
        layoutId: layout.id,
        customSlots: template.customSlots,
        requiredCaptureCount:
          resolveLayout(layout.id, template.customSlots)?.requiredCaptureCount ?? 0,
        frameMode: "custom",
        overlayId: overlay.id,
        selectedTemplateId: template.id,
        templateEditor: { sourceTemplateId: template.id, startingName: template.name },
        frameTransform: template.frameTransform,
        holderTransforms: template.holderTransforms,
        photoTransforms: template.photoTransforms,
      });
    }
    case "SAVE_TEMPLATE": {
      requirePhase(state, ["template_editing"]);
      const name = validatedTemplateName(command.name);
      const product = getProduct(state.productId);
      const layout = getLayout(state.layoutId);
      const overlay = getOverlay(state.overlayId, state.customOverlays);
      if (!product || !layout || overlay?.kind !== "custom" || !state.templateEditor) {
        throw new CommandError("The template setup is incomplete.");
      }
      if (isCustomLayoutId(layout.id) && !state.customSlots?.length) {
        throw new CommandError("Add at least one photo holder before saving this template.");
      }
      const existing = state.savedTemplates.find((item) => item.id === command.templateId);
      if (existing && existing.id !== state.templateEditor.sourceTemplateId) {
        throw new CommandError("Choose a new template name instead of replacing another template.");
      }
      const timestamp = now();
      const template: SavedTemplate = {
        id: command.templateId,
        name,
        productId: product.id,
        layoutId: layout.id,
        overlayId: overlay.id,
        customSlots: state.customSlots,
        frameTransform: state.frameTransform,
        holderTransforms: state.holderTransforms,
        photoTransforms: state.photoTransforms,
        approved: true,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      return revised(state, {
        ...clearedWorkspace(),
        phase: "template_gallery",
        savedTemplates: [
          ...state.savedTemplates.filter((item) => item.id !== template.id),
          template,
        ].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    case "CANCEL_TEMPLATE_EDIT":
      requirePhase(state, ["template_editing"]);
      return revised(state, { ...clearedWorkspace(), phase: "template_gallery" });
    case "DELETE_TEMPLATE": {
      requirePhase(state, ["template_gallery"]);
      if (!state.savedTemplates.some((item) => item.id === command.templateId)) {
        throw new CommandError("That saved template is no longer available.");
      }
      return revised(state, {
        savedTemplates: state.savedTemplates.filter((item) => item.id !== command.templateId),
      });
    }
    case "ADD_TEMPLATE_HOLDER": {
      requirePhase(state, ["template_editing"]);
      if (!isCustomLayoutId(state.layoutId) || !state.customSlots) {
        throw new CommandError("Photo holders can be added only to a custom layout.");
      }
      if (state.customSlots.length >= MAX_CUSTOM_HOLDERS) {
        throw new CommandError(`Custom templates support up to ${MAX_CUSTOM_HOLDERS} holders.`);
      }
      if (state.customSlots.some((slot) => photoSlotId(slot) === command.holderId)) {
        throw new CommandError("That photo holder already exists.");
      }
      const customSlots = [
        ...state.customSlots,
        defaultCustomSlot(state.layoutId ?? "", command.holderId, state.customSlots.length),
      ];
      return revised(state, {
        customSlots,
        requiredCaptureCount: captureCountForSlots(customSlots),
      });
    }
    case "REMOVE_TEMPLATE_HOLDER": {
      requirePhase(state, ["template_editing"]);
      if (!isCustomLayoutId(state.layoutId) || !state.customSlots) {
        throw new CommandError("Photo holders can be removed only from a custom layout.");
      }
      if (state.customSlots.length <= 1) {
        throw new CommandError("A custom template needs at least one photo holder.");
      }
      const removed = state.customSlots.find((slot) => photoSlotId(slot) === command.holderId);
      if (!removed) throw new CommandError("That photo holder is no longer available.");
      const customSlots = normalizeCaptureLabels(
        state.customSlots.filter((slot) => photoSlotId(slot) !== command.holderId),
      );
      return revised(state, {
        customSlots,
        requiredCaptureCount: captureCountForSlots(customSlots),
        holderTransforms: state.holderTransforms.filter(
          (item) => !holderMatches(item, command.holderId, removed.captureIndex + 1),
        ),
        photoTransforms: state.photoTransforms.filter(
          (item) => !holderMatches(item, command.holderId, removed.captureIndex + 1),
        ),
      });
    }
    case "SET_TEMPLATE_HOLDER_CAPTURE": {
      requirePhase(state, ["template_editing"]);
      if (!isCustomLayoutId(state.layoutId) || !state.customSlots) {
        throw new CommandError("Capture mapping is available only for a custom layout.");
      }
      if (
        !Number.isInteger(command.captureSlot) ||
        command.captureSlot < 1 ||
        command.captureSlot > 8
      ) {
        throw new CommandError("Choose Capture 1 through Capture 8.");
      }
      if (!state.customSlots.some((slot) => photoSlotId(slot) === command.holderId)) {
        throw new CommandError("That photo holder is no longer available.");
      }
      const customSlots = normalizeCaptureLabels(
        state.customSlots.map((slot) =>
          photoSlotId(slot) === command.holderId
            ? { ...slot, captureIndex: command.captureSlot - 1 }
            : slot,
        ),
      );
      return revised(state, {
        customSlots,
        requiredCaptureCount: captureCountForSlots(customSlots),
      });
    }
    case "BEGIN_SESSION":
      requirePhase(state, ["idle"]);
      return revised(state, {
        phase: "selecting",
        sessionId: command.sessionId,
        productId: null,
        layoutId: null,
        frameMode: null,
        designId: null,
        overlayId: "none",
        selectedTemplateId: null,
        templateEditor: null,
        customSlots: null,
        frameTransform: identityMediaTransform(),
        holderTransforms: [],
        photoTransforms: [],
        requiredCaptureCount: 0,
        captures: [],
        pendingCapture: null,
        captureSequence: null,
        retakesRemaining: 2,
        cashConfirmed: false,
        consentRecorded: false,
        deliverables: [],
      });
    case "SELECT_TEMPLATE": {
      requirePhase(state, ["selecting", "reviewing"]);
      const template = state.savedTemplates.find((item) => item.id === command.templateId);
      if (!template?.approved) throw new CommandError("That template is not available.");
      const product = getProduct(template.productId);
      const layout = getLayout(template.layoutId);
      const overlay = getOverlay(template.overlayId, state.customOverlays);
      const resolvedLayout = resolveLayout(layout?.id ?? null, template.customSlots);
      if (
        !product ||
        !layout ||
        !resolvedLayout ||
        !product.layoutIds.includes(layout.id) ||
        overlay?.kind !== "custom" ||
        !overlaySupportsLayout(overlay, layout.id)
      ) {
        throw new CommandError("That template is missing its layout or imported artwork.");
      }
      if (
        state.phase === "reviewing" &&
        (state.layoutId !== layout.id ||
          state.requiredCaptureCount !== resolvedLayout.requiredCaptureCount)
      ) {
        throw new CommandError(
          "After capture, choose a template made for the current layout and capture count.",
        );
      }
      return revised(state, {
        productId: product.id,
        layoutId: layout.id,
        customSlots: template.customSlots,
        requiredCaptureCount: resolvedLayout.requiredCaptureCount,
        frameMode: "custom",
        designId: null,
        overlayId: overlay.id,
        selectedTemplateId: template.id,
        frameTransform: template.frameTransform,
        holderTransforms: template.holderTransforms,
        photoTransforms: template.photoTransforms,
      });
    }
    case "SELECT_PRODUCT": {
      requirePhase(state, ["selecting"]);
      const product = getProduct(command.productId);
      if (!product || product.templateOnly) {
        throw new CommandError("That product is available only through a saved template.");
      }
      return revised(state, {
        productId: product.id,
        selectedTemplateId: null,
        layoutId: null,
        customSlots: null,
        frameMode: null,
        designId: null,
        overlayId: "none",
        frameTransform: identityMediaTransform(),
        holderTransforms: [],
        photoTransforms: [],
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
        customSlots: null,
        selectedTemplateId: null,
        frameMode: null,
        designId: null,
        requiredCaptureCount: layout.requiredCaptureCount,
        overlayId: "none",
        frameTransform: identityMediaTransform(),
        holderTransforms: [],
        photoTransforms: [],
      });
    }
    case "SELECT_FRAME_MODE": {
      requirePhase(state, ["selecting", "reviewing"]);
      if (!state.layoutId) throw new CommandError("Choose a layout before choosing a frame.");
      const currentOverlay = getOverlay(state.overlayId, state.customOverlays);
      return revised(state, {
        frameMode: command.frameMode,
        selectedTemplateId: null,
        designId: command.frameMode === "custom" ? null : state.designId,
        overlayId:
          command.frameMode === "custom"
            ? currentOverlay?.kind === "custom"
              ? currentOverlay.id
              : "none"
            : currentOverlay?.kind === "custom"
              ? "none"
              : state.overlayId,
        frameTransform: identityMediaTransform(),
      });
    }
    case "SELECT_DESIGN": {
      requirePhase(state, ["selecting", "reviewing"]);
      if (!getDesign(command.designId)) throw new CommandError("That design is not available.");
      const currentOverlay = getOverlay(state.overlayId, state.customOverlays);
      return revised(state, {
        frameMode: "color",
        selectedTemplateId: null,
        designId: command.designId,
        overlayId: currentOverlay?.kind === "custom" ? "none" : state.overlayId,
        frameTransform: identityMediaTransform(),
      });
    }
    case "SELECT_OVERLAY": {
      requirePhase(state, ["selecting", "reviewing"]);
      const layout = getLayout(state.layoutId);
      const overlay = getOverlay(command.overlayId, state.customOverlays);
      if (!layout || !overlay || !overlaySupportsLayout(overlay, layout.id)) {
        throw new CommandError("That overlay is not compatible with the selected layout.");
      }
      return revised(state, {
        frameMode: overlay.kind === "custom" ? "custom" : "color",
        selectedTemplateId: null,
        designId: overlay.kind === "custom" ? null : state.designId,
        overlayId: overlay.id,
        frameTransform: overlay.kind === "custom" ? identityMediaTransform() : state.frameTransform,
      });
    }
    case "UPDATE_FRAME_TRANSFORM":
      requirePhase(state, ["reviewing", "template_editing"]);
      if (
        state.frameMode !== "custom" ||
        getOverlay(state.overlayId, state.customOverlays)?.kind !== "custom"
      ) {
        throw new CommandError("Only a custom frame can be repositioned.");
      }
      assertMediaTransform(command.transform);
      return revised(state, { frameTransform: command.transform });
    case "UPDATE_HOLDER_TRANSFORM": {
      requirePhase(state, ["reviewing", "template_editing"]);
      if (
        state.frameMode !== "custom" ||
        getOverlay(state.overlayId, state.customOverlays)?.kind !== "custom"
      ) {
        throw new CommandError("Photo-holder positioning is available with a custom frame.");
      }
      if (
        state.phase === "reviewing" &&
        !state.captures.some((capture) => capture.slot === command.slot)
      ) {
        throw new CommandError("Choose an existing photo holder to reposition.");
      }
      const holderLayout = stateLayout(state);
      const holderId = command.holderId ?? `capture-${command.slot}`;
      if (
        !holderLayout?.slots.some(
          (slot) => photoSlotId(slot) === holderId && slot.captureIndex + 1 === command.slot,
        )
      ) {
        throw new CommandError("Choose a placeholder in this template.");
      }
      assertMediaTransform(command.transform);
      return revised(state, {
        holderTransforms: [
          ...state.holderTransforms.filter((item) => !holderMatches(item, holderId, command.slot)),
          {
            slot: command.slot,
            ...(command.holderId ? { holderId: command.holderId } : {}),
            ...command.transform,
          },
        ].sort((a, b) => (a.holderId ?? `${a.slot}`).localeCompare(b.holderId ?? `${b.slot}`)),
      });
    }
    case "UPDATE_PHOTO_TRANSFORM": {
      requirePhase(state, ["reviewing", "template_editing"]);
      if (
        state.frameMode !== "custom" ||
        getOverlay(state.overlayId, state.customOverlays)?.kind !== "custom"
      ) {
        throw new CommandError("Photo positioning is available with a custom frame.");
      }
      if (
        state.phase === "reviewing" &&
        !state.captures.some((capture) => capture.slot === command.slot)
      ) {
        throw new CommandError("Choose an existing photo to reposition.");
      }
      const photoLayout = stateLayout(state);
      const holderId = command.holderId ?? `capture-${command.slot}`;
      if (
        !photoLayout?.slots.some(
          (slot) => photoSlotId(slot) === holderId && slot.captureIndex + 1 === command.slot,
        )
      ) {
        throw new CommandError("Choose a placeholder in this template.");
      }
      assertMediaTransform(command.transform);
      const photoTransform = normalizePhotoTransform(command.transform);
      return revised(state, {
        photoTransforms: [
          ...state.photoTransforms.filter((item) => !holderMatches(item, holderId, command.slot)),
          {
            slot: command.slot,
            ...(command.holderId ? { holderId: command.holderId } : {}),
            ...photoTransform,
          },
        ].sort((a, b) => (a.holderId ?? `${a.slot}`).localeCompare(b.holderId ?? `${b.slot}`)),
      });
    }
    case "RECORD_CONSENT":
      requirePhase(state, ["selecting"]);
      return revised(state, { consentRecorded: true });
    case "SUBMIT_SELECTION": {
      requirePhase(state, ["selecting"]);
      const selectedOverlay = getOverlay(state.overlayId, state.customOverlays);
      const validColorFrame =
        state.frameMode === "color" &&
        Boolean(state.designId) &&
        Boolean(selectedOverlay && selectedOverlay.kind !== "custom");
      const validCustomFrame = state.frameMode === "custom" && selectedOverlay?.kind === "custom";
      if (
        !state.productId ||
        !state.layoutId ||
        (!validColorFrame && !validCustomFrame) ||
        !state.consentRecorded
      ) {
        throw new CommandError("Complete the product, layout, frame, and consent steps first.");
      }
      return revised(state, { phase: "awaiting_cash" });
    }
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
      {
        const selectedOverlay = getOverlay(state.overlayId, state.customOverlays);
        const validColorFrame =
          state.frameMode === "color" &&
          Boolean(state.designId) &&
          Boolean(selectedOverlay && selectedOverlay.kind !== "custom");
        const validCustomFrame = state.frameMode === "custom" && selectedOverlay?.kind === "custom";
        if (!validColorFrame && !validCustomFrame) {
          throw new CommandError("Choose a complete frame before approving the layout.");
        }
      }
      return revised(state, { phase: "processing" });
    case "PROCESSING_STARTED":
      requirePhase(state, ["processing"]);
      return revised(state, { phase: "processing" });
    case "PROCESSING_COMPLETED":
      requirePhase(state, ["processing"]);
      return revised(state, { phase: "complete", deliverables: command.deliverables });
    case "REGISTER_CUSTOM_OVERLAY": {
      const overlay = command.overlay;
      if (!getLayout(overlay.layoutIds[0])) {
        throw new CommandError("The imported overlay references an unknown layout.");
      }
      return revised(state, {
        customOverlays: [...state.customOverlays.filter((item) => item.id !== overlay.id), overlay],
      });
    }
    case "DELETE_CUSTOM_OVERLAY": {
      const overlay = state.customOverlays.find((item) => item.id === command.overlayId);
      if (!overlay) throw new CommandError("That imported frame is no longer available.");
      if (state.savedTemplates.some((template) => template.overlayId === overlay.id)) {
        throw new CommandError("Delete templates using this artwork before deleting the artwork.");
      }
      const wasSelected = state.overlayId === overlay.id;
      return revised(state, {
        customOverlays: state.customOverlays.filter((item) => item.id !== overlay.id),
        overlayId: wasSelected ? "none" : state.overlayId,
        frameTransform: wasSelected ? identityMediaTransform() : state.frameTransform,
      });
    }
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
        customOverlays: state.customOverlays,
        savedTemplates: state.savedTemplates,
        revision: state.revision + 1,
        updatedAt: now(),
      };
  }
}

export const controllerActorFor = (state: BoothState): Actor =>
  state.operationMode === "attendant" ? "attendant" : "customer";
