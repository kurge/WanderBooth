import { useEffect, useMemo, useRef, useState } from "react";

import wanderPressSplashLogo from "../../assets/brand/source/wander-press-splash-shadow.png";
import {
  type CustomOverlay,
  designs,
  getDesign,
  getLayout,
  getOverlay,
  getProduct,
  identityMediaTransform,
  isCustomLayoutId,
  type Layout,
  layouts,
  MAX_CUSTOM_HOLDERS,
  type MediaTransform,
  type Overlay,
  overlaySupportsLayout,
  overlays,
  photoSlotId,
  products,
  resolveLayout,
} from "../shared/catalog";
import { photoFilterCss, photoFilters } from "../shared/filters";
import type {
  Actor,
  BoothEvent,
  BoothState,
  Command,
  HolderTransform,
  OperationMode,
  PhotoTransform,
  SavedTemplate,
} from "../shared/session";
import { activeEventFor, galleryTemplatesFor, sessionTemplatesFor } from "../shared/session";
import { createId } from "./createId";
import { type ResizeHandle, resizeTransform } from "./resizeTransform";
import { hostHttpUrl, useBoothConnection } from "./useBoothConnection";
import { type CameraStatus, useMacBookCamera } from "./useMacBookCamera";

type Surface = "operator" | "customer" | "print";

const surface = (new URLSearchParams(window.location.search).get("surface") ??
  "operator") as Surface;

const phaseLabels: Record<BoothState["phase"], string> = {
  idle: "Ready for a new guest",
  template_gallery: "Template gallery",
  template_editing: "Editing a reusable template",
  selecting: "Choose the experience",
  awaiting_cash: "Waiting for cash confirmation",
  ready: "Ready for the next photo",
  countdown: "Get ready…",
  capturing: "Capturing…",
  reviewing: "Review your photos",
  processing: "Building your WanderBooth set",
  complete: "Your photos are ready",
  error: "The booth needs attention",
};

const actorForSurface = (selectedSurface: Surface): Actor =>
  selectedSurface === "customer" ? "customer" : "attendant";

const mediaSource = (url: string) => `${hostHttpUrl}${url}`;

const openPrintPreview = (eventId: string, sessionId: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set("surface", "print");
  url.searchParams.set("eventId", eventId);
  url.searchParams.set("sessionId", sessionId);
  window.open(url.toString(), `WanderBoothPrint-${sessionId}`);
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      <span className="brand-mark__splat" aria-hidden="true">
        <img src={wanderPressSplashLogo} alt="" />
      </span>
      <span>
        <strong>WanderBooth</strong>
        <small>by Wander Press PH</small>
      </span>
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`connection ${connected ? "connection--online" : "connection--offline"}`}>
      <i aria-hidden="true" />
      {connected ? "Host connected" : "Reconnecting"}
    </span>
  );
}

function ModeSelector({
  value,
  sendCommand,
}: {
  value: OperationMode;
  sendCommand: (command: Command) => void;
}) {
  return (
    <fieldset className="mode-selector">
      <legend>Who controls the session?</legend>
      <button
        className={value === "attendant" ? "mode-card mode-card--selected" : "mode-card"}
        type="button"
        onClick={() => sendCommand({ type: "SET_MODE", mode: "attendant" })}
      >
        <span className="mode-card__icon">A</span>
        <span>
          <strong>Attendant-operated</strong>
          <small>Staff chooses and retakes. The iPad presents the experience.</small>
        </span>
      </button>
      <button
        className={value === "self_service" ? "mode-card mode-card--selected" : "mode-card"}
        type="button"
        onClick={() => sendCommand({ type: "SET_MODE", mode: "self_service" })}
      >
        <span className="mode-card__icon">S</span>
        <span>
          <strong>Self-service</strong>
          <small>The guest chooses, captures, reviews, and approves on the iPad.</small>
        </span>
      </button>
    </fieldset>
  );
}

function CapturePreview({ state, compact = false }: { state: BoothState; compact?: boolean }) {
  const slots = Array.from({ length: state.requiredCaptureCount || 3 }, (_, index) => index + 1);
  return (
    <section
      className="photo-grid"
      aria-label="Session photos"
      style={{
        gridTemplateColumns: `repeat(${compact ? Math.min(slots.length, 2) : Math.min(slots.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {slots.map((slot) => {
        const capture = state.captures.find((item) => item.slot === slot);
        return (
          <figure className={capture ? "photo-card photo-card--filled" : "photo-card"} key={slot}>
            {capture ? (
              <img
                src={mediaSource(capture.mediaUrl)}
                style={{ filter: photoFilterCss(capture.filterId) }}
                alt={`Capture ${slot}`}
              />
            ) : (
              <div className="photo-card__empty">
                <span>{slot}</span>
                <small>Waiting for photo</small>
              </div>
            )}
          </figure>
        );
      })}
    </section>
  );
}

function PhotoFilterPicker({
  state,
  sendCommand,
}: {
  state: BoothState;
  sendCommand: (command: Command) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState(state.captures[0]?.slot ?? 1);
  const selectedCapture =
    state.captures.find((capture) => capture.slot === selectedSlot) ?? state.captures[0];

  useEffect(() => {
    if (selectedCapture) setSelectedSlot(selectedCapture.slot);
  }, [selectedCapture]);

  if (!selectedCapture) return null;

  return (
    <section className="photo-filter-picker">
      <div className="photo-filter-picker__heading">
        <div>
          <span>Photo filters</span>
          <small>Choose a photo, then apply its own look.</small>
        </div>
        <strong>Photo {selectedCapture.slot}</strong>
      </div>
      <div className="photo-filter-picker__tabs">
        {state.captures.map((capture) => (
          <button
            type="button"
            aria-pressed={capture.slot === selectedCapture.slot}
            onClick={() => setSelectedSlot(capture.slot)}
            key={capture.slot}
          >
            <img
              src={mediaSource(capture.mediaUrl)}
              style={{ filter: photoFilterCss(capture.filterId) }}
              alt=""
            />
            <span>Photo {capture.slot}</span>
          </button>
        ))}
      </div>
      <div className="photo-filter-picker__options">
        {photoFilters.map((filter) => (
          <button
            type="button"
            aria-pressed={(selectedCapture.filterId ?? "original") === filter.id}
            onClick={() =>
              sendCommand({
                type: "SELECT_PHOTO_FILTER",
                slot: selectedCapture.slot,
                filterId: filter.id,
              })
            }
            key={filter.id}
          >
            <img
              src={mediaSource(selectedCapture.mediaUrl)}
              style={{ filter: filter.cssFilter }}
              alt=""
            />
            <span>{filter.name}</span>
          </button>
        ))}
      </div>
      <p>
        Filters are rendered locally into the final photo, layout, slideshow, and print—without
        changing the original capture.
      </p>
    </section>
  );
}

function LayoutThumbnail({ layout }: { layout: Layout }) {
  return (
    <span
      className="layout-thumbnail"
      style={{ aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}` }}
      aria-hidden="true"
    >
      {layout.slots.map((slot) => (
        <i
          className={`layout-thumbnail__slot layout-thumbnail__slot--${slot.shape}`}
          key={`${slot.captureIndex}-${slot.x}-${slot.y}`}
          style={{
            left: `${(slot.x / layout.canvasWidth) * 100}%`,
            top: `${(slot.y / layout.canvasHeight) * 100}%`,
            width: `${(slot.width / layout.canvasWidth) * 100}%`,
            height: `${(slot.height / layout.canvasHeight) * 100}%`,
          }}
        />
      ))}
      <b>{layout.printSize.replace("x", "×")}</b>
    </span>
  );
}

function OverlayThumbnail({ overlay }: { overlay: Overlay }) {
  if (overlay.kind === "custom") {
    return (
      <span className="overlay-thumbnail overlay-thumbnail--custom" aria-hidden="true">
        <img src={mediaSource(overlay.mediaUrl)} alt="" />
        <b>Imported</b>
      </span>
    );
  }

  return (
    <span className={`overlay-thumbnail overlay-thumbnail--${overlay.kind}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function DeleteImportedOverlayButton({
  overlay,
  compact = false,
}: {
  overlay: CustomOverlay;
  compact?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  const deleteOverlay = async () => {
    if (
      !window.confirm(
        `Delete “${overlay.name}” from this booth? This removes its local artwork files and cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(
        `${hostHttpUrl}/api/overlays/${encodeURIComponent(overlay.id)}`,
        {
          method: "DELETE",
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The imported frame could not be deleted.");
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "The imported frame could not be deleted.",
      );
      setDeleting(false);
    }
  };

  return (
    <button
      className={`overlay-delete ${compact ? "overlay-delete--compact" : ""}`}
      type="button"
      disabled={deleting}
      onClick={() => void deleteOverlay()}
      aria-label={`Delete ${overlay.name}`}
    >
      {deleting ? "Deleting…" : compact ? "×" : "Delete imported frame"}
    </button>
  );
}

function OverlayImporter({
  layout,
  onImported,
}: {
  layout: Layout;
  onImported: (overlayId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importOverlay = async () => {
    if (!file || !name.trim()) return;
    setUploading(true);
    setStatus(null);
    try {
      const response = await fetch(`${hostHttpUrl}/api/overlays`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "image/png",
          "X-WanderBooth-Layout-Id": layout.id,
          "X-WanderBooth-Overlay-Mode": "transparent_artwork",
          "X-WanderBooth-Overlay-Name": encodeURIComponent(name.trim()),
        },
        body: file,
      });
      const result = (await response.json()) as { error?: string; overlay?: CustomOverlay };
      if (!response.ok || !result.overlay) {
        throw new Error(result.error ?? "The design could not be imported.");
      }
      setStatus({ kind: "success", message: `${result.overlay.name} is ready and selected.` });
      setFile(null);
      setName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImported(result.overlay.id);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "The design could not be imported.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="overlay-importer" aria-labelledby="overlay-import-title">
      <div className="overlay-importer__copy">
        <span>Operator tool</span>
        <h3 id="overlay-import-title">Import an event frame</h3>
        <p>
          This design will be saved locally for <strong>{layout.name}</strong> at{" "}
          {layout.canvasWidth}×{layout.canvasHeight}px.
        </p>
      </div>
      <div className="overlay-importer__fields">
        <label className="file-picker">
          <span>{file ? file.name : "Choose transparent PNG or WebP"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setStatus(null);
              if (selected) setName(selected.name.replace(/\.[^.]+$/, ""));
            }}
          />
        </label>
        <label>
          Design name
          <input
            type="text"
            value={name}
            maxLength={80}
            placeholder="Example: Garcia Wedding"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="overlay-importer__file-note">
          Use a transparent PNG with the photo openings already cut out. WanderBooth keeps the
          artwork above the photos and does not create the openings for you.
        </p>
        <button
          className="button button--dark"
          type="button"
          disabled={!file || !name.trim() || uploading}
          onClick={() => void importOverlay()}
        >
          {uploading ? "Preparing design…" : "Import and select"}
        </button>
        {status && (
          <p className={`overlay-importer__status overlay-importer__status--${status.kind}`}>
            {status.message}
          </p>
        )}
      </div>
    </section>
  );
}

const clampTransform = (value: MediaTransform): MediaTransform => ({
  offsetX: Math.max(-1, Math.min(1, value.offsetX)),
  offsetY: Math.max(-1, Math.min(1, value.offsetY)),
  scaleX: Math.max(0.2, Math.min(4, value.scaleX)),
  scaleY: Math.max(0.2, Math.min(4, value.scaleY)),
  rotation: Math.max(-180, Math.min(180, value.rotation)),
  locked: value.locked,
});

const holderTransformMap = (transforms: Array<HolderTransform | PhotoTransform>) =>
  Object.fromEntries(
    transforms.map(({ slot, holderId, ...transform }) => [
      holderId ?? `capture-${slot}`,
      transform,
    ]),
  ) as Record<string, MediaTransform>;

type CompositionTarget = "frame" | `holder:${string}` | `image:${string}`;
type InteractionKind = "move" | "resize" | "rotate";
type TargetGeometry = {
  baseWidth: number;
  baseHeight: number;
  centerX: number;
  centerY: number;
  parentRotation: number;
  parentScaleX: number;
  parentScaleY: number;
};

const resizeHandles: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const rotateVector = (x: number, y: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
};

const normalizeRotation = (degrees: number) => {
  let normalized = ((((degrees + 180) % 360) + 360) % 360) - 180;
  if (normalized === -180) normalized = 180;
  return normalized;
};

const transformStyle = (transform: MediaTransform) => ({
  transform: `translate(${transform.offsetX * 100}%, ${transform.offsetY * 100}%) rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY})`,
});

const holderStyle = (slot: Layout["slots"][number], layout: Layout, transform: MediaTransform) => ({
  left: `${((slot.x + slot.width * transform.offsetX + (slot.width * (1 - transform.scaleX)) / 2) / layout.canvasWidth) * 100}%`,
  top: `${((slot.y + slot.height * transform.offsetY + (slot.height * (1 - transform.scaleY)) / 2) / layout.canvasHeight) * 100}%`,
  width: `${((slot.width * transform.scaleX) / layout.canvasWidth) * 100}%`,
  height: `${((slot.height * transform.scaleY) / layout.canvasHeight) * 100}%`,
  transform: `rotate(${transform.rotation}deg)`,
});

const describeCompositionTarget = (target: CompositionTarget) => {
  if (target === "frame") return { kind: "frame" as const, holderId: null };
  const separator = target.indexOf(":");
  return {
    kind: target.slice(0, separator) as "holder" | "image",
    holderId: target.slice(separator + 1),
  };
};

const compositionTargetLabel = (target: CompositionTarget, layout: Layout) => {
  const description = describeCompositionTarget(target);
  if (description.kind === "frame") return "frame artwork";
  const slot = layout.slots.find((item) => photoSlotId(item) === description.holderId);
  const captureSlot = (slot?.captureIndex ?? 0) + 1;
  return description.kind === "holder"
    ? `Capture ${captureSlot} holder`
    : `Capture ${captureSlot} image`;
};

function LayoutPreview({
  state,
  editable,
  sendCommand,
  context = "session",
}: {
  state: BoothState;
  editable: boolean;
  sendCommand: (command: Command) => void;
  context?: "session" | "template";
}) {
  const layout = resolveLayout(state.layoutId, state.customSlots);
  const design = getDesign(state.designId) ?? getDesign("wander-splash");
  const overlay = getOverlay(state.overlayId, state.customOverlays);
  const customOverlay = overlay?.kind === "custom" ? overlay : null;
  const [activeTarget, setActiveTarget] = useState<CompositionTarget>("frame");
  const [frameDraft, setFrameDraft] = useState(state.frameTransform);
  const [holderDrafts, setHolderDrafts] = useState<Record<string, MediaTransform>>(
    holderTransformMap(state.holderTransforms),
  );
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, MediaTransform>>(
    holderTransformMap(state.photoTransforms),
  );
  const interactionRef = useRef<{
    kind: InteractionKind;
    handle?: ResizeHandle;
    geometry: TargetGeometry;
    initial: MediaTransform;
    latest: MediaTransform;
    startAngle: number;
    startX: number;
    startY: number;
    target: CompositionTarget;
  } | null>(null);

  useEffect(() => setFrameDraft(state.frameTransform), [state.frameTransform]);
  useEffect(
    () => setHolderDrafts(holderTransformMap(state.holderTransforms)),
    [state.holderTransforms],
  );
  useEffect(
    () => setPhotoDrafts(holderTransformMap(state.photoTransforms)),
    [state.photoTransforms],
  );

  if (!layout || !design || !overlay) return null;

  const transformFor = (target: CompositionTarget) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") return frameDraft;
    if (description.kind === "holder") {
      return holderDrafts[description.holderId] ?? identityMediaTransform();
    }
    return photoDrafts[description.holderId] ?? identityMediaTransform();
  };
  const updateDraft = (target: CompositionTarget, transform: MediaTransform) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") setFrameDraft(transform);
    else if (description.kind === "holder") {
      setHolderDrafts((current) => ({ ...current, [description.holderId]: transform }));
    } else {
      setPhotoDrafts((current) => ({ ...current, [description.holderId]: transform }));
    }
  };
  const commitTransform = (target: CompositionTarget, transform: MediaTransform) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") {
      sendCommand({ type: "UPDATE_FRAME_TRANSFORM", transform });
    } else {
      const slot = layout.slots.find((item) => photoSlotId(item) === description.holderId);
      if (!slot) return;
      sendCommand({
        type: description.kind === "holder" ? "UPDATE_HOLDER_TRANSFORM" : "UPDATE_PHOTO_TRANSFORM",
        slot: slot.captureIndex + 1,
        holderId: description.holderId,
        transform,
      });
    }
  };
  const activeTransform = transformFor(activeTarget);
  const customSource = customOverlay
    ? mediaSource(customOverlay.sourceMediaUrl ?? customOverlay.mediaUrl)
    : null;

  const targetGeometry = (target: CompositionTarget, bounds: DOMRect): TargetGeometry | null => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") {
      return {
        baseWidth: bounds.width,
        baseHeight: bounds.height,
        centerX: bounds.left + bounds.width / 2 + frameDraft.offsetX * bounds.width,
        centerY: bounds.top + bounds.height / 2 + frameDraft.offsetY * bounds.height,
        parentRotation: 0,
        parentScaleX: 1,
        parentScaleY: 1,
      };
    }
    const slot = layout.slots.find((item) => photoSlotId(item) === description.holderId);
    if (!slot) return null;
    const holderTransform = holderDrafts[description.holderId] ?? identityMediaTransform();
    const baseWidth = bounds.width * (slot.width / layout.canvasWidth);
    const baseHeight = bounds.height * (slot.height / layout.canvasHeight);
    const holderCenterX =
      bounds.left +
      bounds.width * ((slot.x + slot.width / 2) / layout.canvasWidth) +
      holderTransform.offsetX * baseWidth;
    const holderCenterY =
      bounds.top +
      bounds.height * ((slot.y + slot.height / 2) / layout.canvasHeight) +
      holderTransform.offsetY * baseHeight;
    if (description.kind === "holder") {
      return {
        baseWidth,
        baseHeight,
        centerX: holderCenterX,
        centerY: holderCenterY,
        parentRotation: 0,
        parentScaleX: 1,
        parentScaleY: 1,
      };
    }
    const photoTransform = photoDrafts[description.holderId] ?? identityMediaTransform();
    const photoOffset = rotateVector(
      photoTransform.offsetX * baseWidth * holderTransform.scaleX,
      photoTransform.offsetY * baseHeight * holderTransform.scaleY,
      holderTransform.rotation,
    );
    return {
      baseWidth,
      baseHeight,
      centerX: holderCenterX + photoOffset.x,
      centerY: holderCenterY + photoOffset.y,
      parentRotation: holderTransform.rotation,
      parentScaleX: holderTransform.scaleX,
      parentScaleY: holderTransform.scaleY,
    };
  };

  const worldVectorToParent = (x: number, y: number, geometry: TargetGeometry) => {
    const unrotated = rotateVector(x, y, -geometry.parentRotation);
    return {
      x: unrotated.x / geometry.parentScaleX,
      y: unrotated.y / geometry.parentScaleY,
    };
  };

  const beginInteraction = (
    event: React.PointerEvent<HTMLDivElement>,
    target: CompositionTarget,
    kind: InteractionKind,
    handle?: ResizeHandle,
  ) => {
    if (!editable || !customOverlay) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const geometry = targetGeometry(target, bounds);
    if (!geometry) return;
    const initial = transformFor(target);
    setActiveTarget(target);
    if (initial.locked) return;
    const pointerFromCenter = worldVectorToParent(
      event.clientX - geometry.centerX,
      event.clientY - geometry.centerY,
      geometry,
    );
    interactionRef.current = {
      kind,
      handle,
      geometry,
      initial,
      latest: initial,
      startAngle: Math.atan2(pointerFromCenter.y, pointerFromCenter.x),
      startX: event.clientX,
      startY: event.clientY,
      target,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const beginCanvasInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const targetElement = event.target as HTMLElement;
    const controlTarget = targetElement.dataset.transformTarget as CompositionTarget | undefined;
    const interactionKind = targetElement.dataset.interactionKind as InteractionKind | undefined;
    if (controlTarget && interactionKind) {
      event.preventDefault();
      beginInteraction(
        event,
        controlTarget,
        interactionKind,
        targetElement.dataset.resizeHandle as ResizeHandle | undefined,
      );
      return;
    }
    const slotElement = targetElement.closest<HTMLElement>("[data-holder-id]");
    if (slotElement) {
      const holderId = slotElement.dataset.holderId;
      if (!holderId) return;
      const imageTarget: CompositionTarget = `image:${holderId}`;
      const target: CompositionTarget =
        activeTarget === imageTarget ? imageTarget : `holder:${holderId}`;
      beginInteraction(event, target, "move");
      return;
    }
    beginInteraction(event, "frame", "move");
  };

  const continueInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    if (event.pointerType !== "touch" && event.buttons === 0) {
      interactionRef.current = null;
      commitTransform(interaction.target, interaction.latest);
      return;
    }
    const pointerMovement = Math.hypot(
      event.clientX - interaction.startX,
      event.clientY - interaction.startY,
    );
    if (pointerMovement < 4) return;
    const { geometry, initial } = interaction;
    const parentDelta = worldVectorToParent(
      event.clientX - interaction.startX,
      event.clientY - interaction.startY,
      geometry,
    );
    let next: MediaTransform;
    if (interaction.kind === "move") {
      next = clampTransform({
        ...initial,
        offsetX: initial.offsetX + parentDelta.x / geometry.baseWidth,
        offsetY: initial.offsetY + parentDelta.y / geometry.baseHeight,
      });
    } else if (interaction.kind === "rotate") {
      const pointerFromCenter = worldVectorToParent(
        event.clientX - geometry.centerX,
        event.clientY - geometry.centerY,
        geometry,
      );
      const currentAngle = Math.atan2(pointerFromCenter.y, pointerFromCenter.x);
      next = clampTransform({
        ...initial,
        rotation: normalizeRotation(
          initial.rotation + ((currentAngle - interaction.startAngle) * 180) / Math.PI,
        ),
      });
    } else {
      const localDelta = rotateVector(parentDelta.x, parentDelta.y, -initial.rotation);
      const handle = interaction.handle ?? "se";
      const resized = resizeTransform({
        baseWidth: geometry.baseWidth,
        baseHeight: geometry.baseHeight,
        handle,
        initial,
        localDelta,
      });
      const parentCenterShift = rotateVector(
        resized.localCenterShift.x,
        resized.localCenterShift.y,
        initial.rotation,
      );
      next = clampTransform({
        ...initial,
        offsetX: initial.offsetX + parentCenterShift.x / geometry.baseWidth,
        offsetY: initial.offsetY + parentCenterShift.y / geometry.baseHeight,
        scaleX: resized.scaleX,
        scaleY: resized.scaleY,
      });
    }
    interaction.latest = next;
    updateDraft(interaction.target, next);
  };
  const endInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commitTransform(interaction.target, interaction.latest);
  };
  const enterCropMode = (event: React.MouseEvent<HTMLDivElement>) => {
    const slotElement = (event.target as HTMLElement).closest<HTMLElement>("[data-holder-id]");
    const holderId = slotElement?.dataset.holderId;
    if (!holderId) return;
    event.preventDefault();
    setActiveTarget(`image:${holderId}`);
  };
  const resetActive = () => {
    const reset = identityMediaTransform();
    updateDraft(activeTarget, reset);
    commitTransform(activeTarget, reset);
  };
  const toggleActiveLock = () => {
    const next = { ...activeTransform, locked: !activeTransform.locked };
    updateDraft(activeTarget, next);
    commitTransform(activeTarget, next);
  };
  const selectActivePhotoMode = (kind: "holder" | "image") => {
    const description = describeCompositionTarget(activeTarget);
    if (description.holderId !== null) setActiveTarget(`${kind}:${description.holderId}`);
  };
  const selectionControls = (target: CompositionTarget, transform: MediaTransform) => (
    <>
      {transform.locked ? (
        <i className="layout-composer__lock-badge" aria-hidden="true">
          Locked
        </i>
      ) : (
        <>
          {(describeCompositionTarget(target).kind === "image"
            ? resizeHandles.filter((handle) => handle.length === 2)
            : resizeHandles
          ).map((handle) => (
            <i
              className={`layout-composer__handle layout-composer__handle--${handle}`}
              data-interaction-kind="resize"
              data-resize-handle={handle}
              data-transform-target={target}
              key={handle}
            />
          ))}
          <i className="layout-composer__rotation-arm" aria-hidden="true" />
          <i
            className="layout-composer__rotation-handle"
            data-interaction-kind="rotate"
            data-transform-target={target}
            title="Drag to rotate"
          />
        </>
      )}
    </>
  );

  return (
    <section
      className="layout-preview-card"
      aria-label={context === "template" ? "Template layout preview" : "Final layout preview"}
    >
      <div className="layout-preview-card__heading">
        <div>
          <span>
            {context === "template" ? "Reusable template preview" : "Final layout preview"}
          </span>
          <strong>{layout.name}</strong>
        </div>
        <small>{layout.printSize.replace("x", "×")} output</small>
      </div>
      <div
        role="application"
        aria-label={
          editable
            ? context === "template"
              ? "Template placeholder editor"
              : "Direct layout editor"
            : "Final layout"
        }
        className={`layout-composer ${editable ? "layout-composer--editable" : ""}`}
        style={{
          aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
          background: state.frameMode === "color" ? design.background : "#fffaf2",
          maxWidth: layout.canvasWidth > layout.canvasHeight ? "680px" : "420px",
        }}
        onPointerDown={beginCanvasInteraction}
        onPointerMove={continueInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onLostPointerCapture={endInteraction}
        onDoubleClick={enterCropMode}
      >
        {customOverlay?.importMode === "flat_template" && customSource && (
          <img
            className="layout-composer__custom layout-composer__custom--background"
            src={customSource}
            style={transformStyle(frameDraft)}
            alt=""
          />
        )}
        {layout.slots.map((slot) => {
          const captureSlot = slot.captureIndex + 1;
          const holderId = photoSlotId(slot);
          const capture = state.captures.find((item) => item.slot === captureSlot);
          const holderTransform = holderDrafts[holderId] ?? identityMediaTransform();
          const photoTransform = photoDrafts[holderId] ?? identityMediaTransform();
          const holderIsActive = activeTarget === `holder:${holderId}` && editable;
          const imageIsActive = activeTarget === `image:${holderId}` && editable;
          return (
            <div
              className={`layout-composer__slot layout-composer__slot--${slot.shape} ${
                holderIsActive ? "layout-composer__slot--active-holder" : ""
              } ${imageIsActive ? "layout-composer__slot--active-image" : ""}`}
              data-capture-slot={captureSlot}
              data-holder-id={holderId}
              key={holderId}
              style={{
                ...holderStyle(slot, layout, holderTransform),
              }}
            >
              {capture ? (
                <img
                  src={mediaSource(capture.mediaUrl)}
                  style={{
                    ...transformStyle(photoTransform),
                    filter: photoFilterCss(capture.filterId),
                  }}
                  alt=""
                />
              ) : context === "template" ? (
                <div
                  className="layout-composer__sample-photo"
                  style={transformStyle(photoTransform)}
                >
                  <strong>{captureSlot}</strong>
                  <small>Photo placeholder</small>
                </div>
              ) : (
                <span>{captureSlot}</span>
              )}
            </div>
          );
        })}
        {state.frameMode === "color" && (
          <div className={`layout-composer__generated layout-composer__generated--${overlay.kind}`}>
            {layout.brandAreas.map((area) => (
              <div
                className="layout-composer__brand"
                key={`${area.x}-${area.y}-${area.width}-${area.height}`}
                style={{
                  left: `${(area.x / layout.canvasWidth) * 100}%`,
                  top: `${(area.y / layout.canvasHeight) * 100}%`,
                  width: `${(area.width / layout.canvasWidth) * 100}%`,
                  height: `${(area.height / layout.canvasHeight) * 100}%`,
                  color: design.accent,
                }}
              >
                <strong>WanderBooth</strong>
                <small>by Wander Press PH</small>
              </div>
            ))}
          </div>
        )}
        {customOverlay?.importMode === "transparent_artwork" && customSource && (
          <img
            className="layout-composer__custom layout-composer__custom--foreground"
            src={customSource}
            style={transformStyle(frameDraft)}
            alt=""
          />
        )}
        {editable && customOverlay && activeTarget === "frame" && (
          <div
            className="layout-composer__selection layout-composer__selection--frame"
            style={transformStyle(frameDraft)}
            aria-hidden="true"
          >
            <b>Artwork</b>
            {selectionControls("frame", frameDraft)}
          </div>
        )}
        {editable &&
          customOverlay &&
          describeCompositionTarget(activeTarget).kind !== "frame" &&
          layout.slots
            .filter(
              (slot) => photoSlotId(slot) === describeCompositionTarget(activeTarget).holderId,
            )
            .map((slot) => {
              const captureSlot = slot.captureIndex + 1;
              const holderId = photoSlotId(slot);
              const holderTransform = holderDrafts[holderId] ?? identityMediaTransform();
              const photoTransform = photoDrafts[holderId] ?? identityMediaTransform();
              const mode = describeCompositionTarget(activeTarget).kind;
              const slotPosition = {
                ...holderStyle(slot, layout, holderTransform),
              };
              return mode === "holder" ? (
                <div
                  className="layout-composer__selection layout-composer__selection--holder"
                  key={`selection-${holderId}`}
                  style={{
                    ...slotPosition,
                  }}
                  aria-hidden="true"
                >
                  <b>Capture {captureSlot} holder</b>
                  {selectionControls(activeTarget, holderTransform)}
                </div>
              ) : (
                <div
                  className="layout-composer__selection-wrapper"
                  key={`selection-${holderId}`}
                  style={{
                    ...slotPosition,
                  }}
                  aria-hidden="true"
                >
                  <div
                    className="layout-composer__selection layout-composer__selection--image layout-composer__selection--nested"
                    style={transformStyle(photoTransform)}
                  >
                    <b>Crop Capture {captureSlot}</b>
                    {selectionControls(activeTarget, photoTransform)}
                  </div>
                </div>
              );
            })}
        {editable && (
          <span className="layout-composer__drag-hint">
            {describeCompositionTarget(activeTarget).kind === "image"
              ? `Crop mode · drag, resize, or rotate${activeTransform.locked ? " · locked" : ""}`
              : `${activeTransform.locked ? "Locked" : "Drag, resize, or rotate"} ${compositionTargetLabel(activeTarget, layout)}`}
          </span>
        )}
      </div>
      {editable && customOverlay && (
        <div className="composition-editor">
          <div className="composition-editor__selection-bar">
            <span>Selected</span>
            <strong>{compositionTargetLabel(activeTarget, layout)}</strong>
            <button
              type="button"
              aria-pressed={activeTarget === "frame"}
              onClick={() => setActiveTarget("frame")}
            >
              Artwork
            </button>
            {describeCompositionTarget(activeTarget).holderId && (
              <>
                <button
                  type="button"
                  aria-pressed={describeCompositionTarget(activeTarget).kind === "holder"}
                  onClick={() => selectActivePhotoMode("holder")}
                >
                  Move frame
                </button>
                <button
                  type="button"
                  aria-pressed={describeCompositionTarget(activeTarget).kind === "image"}
                  onClick={() => selectActivePhotoMode("image")}
                >
                  Crop image
                </button>
              </>
            )}
          </div>
          <div className="composition-editor__actions">
            <span>
              {Math.round(activeTransform.scaleX * 100)}% ×{" "}
              {Math.round(activeTransform.scaleY * 100)}%
              {activeTransform.rotation !== 0 && ` · ${Math.round(activeTransform.rotation)}°`}
            </span>
            <button
              className="button button--quiet button--tiny"
              type="button"
              onClick={toggleActiveLock}
            >
              {activeTransform.locked ? "Unlock" : "Lock"}
            </button>
            <button
              className="button button--quiet button--tiny"
              type="button"
              disabled={activeTransform.locked}
              onClick={resetActive}
            >
              Reset
            </button>
          </div>
          <p>
            Click a photo to select its frame. Drag a corner to resize proportionally, or a middle
            edge handle to reshape the crop area without stretching the photo. Drag the round handle
            to rotate. Double-click—or choose Crop image—to reposition or scale the photo inside.
            Lock an object when its placement is finished.
            {context === "template" &&
              " These placeholders will be replaced automatically by real captures."}
          </p>
        </div>
      )}
    </section>
  );
}

const readableEventDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));

function EventCard({
  event,
  sendCommand,
}: {
  event: BoothEvent;
  sendCommand: (command: Command) => void;
}) {
  return (
    <article className="event-card">
      <div className="event-card__heading">
        <span className={`event-status event-status--${event.status}`}>{event.status}</span>
        <strong>{event.name}</strong>
        <small>
          {readableEventDate(event.eventDate)} · {event.sessions.length} session
          {event.sessions.length === 1 ? "" : "s"}
        </small>
      </div>
      <dl>
        {event.clientName && (
          <div>
            <dt>Client</dt>
            <dd>{event.clientName}</dd>
          </div>
        )}
        {event.venue && (
          <div>
            <dt>Venue</dt>
            <dd>{event.venue}</dd>
          </div>
        )}
        <div>
          <dt>Starting folder</dt>
          <dd>{event.initialTemplateFolderName}</dd>
        </div>
      </dl>
      <div className="event-card__actions">
        <button
          className="button button--primary"
          type="button"
          onClick={() => sendCommand({ type: "OPEN_EVENT", eventId: event.id })}
        >
          {event.status === "archived" ? "Restore and open" : "Open event"}
        </button>
        {event.status === "active" ? (
          <button
            className="button button--quiet"
            type="button"
            onClick={() => sendCommand({ type: "ARCHIVE_EVENT", eventId: event.id })}
          >
            Archive
          </button>
        ) : (
          <button
            className="button button--quiet"
            type="button"
            onClick={() => sendCommand({ type: "RESTORE_EVENT", eventId: event.id })}
          >
            Restore
          </button>
        )}
        <button
          className="button button--danger"
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Permanently delete “${event.name}” and all of its local sessions, photos, layouts, and videos? This cannot be undone.`,
              )
            ) {
              sendCommand({ type: "DELETE_EVENT", eventId: event.id });
            }
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function EventLibraryPanel({
  state,
  sendCommand,
}: {
  state: BoothState;
  sendCommand: (command: Command) => void;
}) {
  const [showCreate, setShowCreate] = useState(state.events.length === 0);
  const [folderName, setFolderName] = useState("");
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [templateFolderId, setTemplateFolderId] = useState(state.templateFolders[0]?.id ?? "");
  const activeEvents = state.events.filter((event) => event.status === "active");
  const archivedEvents = state.events.filter((event) => event.status === "archived");

  useEffect(() => {
    if (!state.templateFolders.some((folder) => folder.id === templateFolderId)) {
      setTemplateFolderId(state.templateFolders[0]?.id ?? "");
    }
  }, [state.templateFolders, templateFolderId]);

  const createEvent = () => {
    if (!name.trim() || !eventDate || !templateFolderId) return;
    sendCommand({
      type: "CREATE_EVENT",
      eventId: createId(),
      name,
      eventDate,
      endDate: endDate || undefined,
      clientName,
      venue,
      notes,
      templateFolderId,
    });
  };

  return (
    <section className="event-library">
      <div className="event-library__hero">
        <div>
          <span className="eyebrow">Local event workspace</span>
          <h1>Choose an event or create a new one.</h1>
          <p>
            Every customer session, capture, finished layout, and video stays grouped with its event
            on this computer until you delete it.
          </p>
        </div>
        <div className="event-library__hero-actions">
          <button
            className="button button--primary button--large"
            type="button"
            onClick={() => setShowCreate((visible) => !visible)}
          >
            {showCreate ? "Close event form" : "Create an Event"}
          </button>
          <button
            className="button button--quiet button--large"
            type="button"
            onClick={() => sendCommand({ type: "OPEN_TEMPLATE_GALLERY", scope: "library" })}
          >
            Open Template Library
          </button>
        </div>
      </div>

      {showCreate && (
        <section className="event-create-panel">
          <div className="catalog-section__subheading">
            <small>New local project</small>
            <h2>Create an Event</h2>
          </div>
          <div className="event-form-grid">
            <label className="event-form-grid__wide">
              Event name
              <input
                type="text"
                maxLength={120}
                value={name}
                placeholder="LenaMiu Event - Nov 22"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Event date
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>
            <label>
              End date <small>Optional</small>
              <input
                type="date"
                min={eventDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label>
              Client name <small>Optional</small>
              <input
                type="text"
                maxLength={120}
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
              />
            </label>
            <label>
              Venue <small>Optional</small>
              <input
                type="text"
                maxLength={180}
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
              />
            </label>
            <label className="event-form-grid__wide">
              Starting template folder
              <select
                value={templateFolderId}
                onChange={(event) => setTemplateFolderId(event.target.value)}
              >
                {state.templateFolders.map((folder) => (
                  <option value={folder.id} key={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="event-form-grid__wide">
              Notes <small>Optional</small>
              <textarea
                maxLength={1000}
                value={notes}
                rows={3}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
          <div className="event-create-panel__footer">
            <p>
              Templates in the selected folder are copied into this event, so event-only edits do
              not change other events.
            </p>
            <button
              className="button button--primary button--large"
              type="button"
              disabled={!name.trim() || !eventDate || !templateFolderId}
              onClick={createEvent}
            >
              Create and open event
            </button>
          </div>
        </section>
      )}

      <section className="folder-manager">
        <div>
          <span className="eyebrow">Template folders</span>
          <h2>Organize reusable designs</h2>
        </div>
        <div className="folder-manager__create">
          <input
            type="text"
            maxLength={60}
            value={folderName}
            placeholder="Weddings, birthdays…"
            aria-label="New template folder name"
            onChange={(event) => setFolderName(event.target.value)}
          />
          <button
            className="button button--dark"
            type="button"
            disabled={!folderName.trim()}
            onClick={() => {
              sendCommand({
                type: "CREATE_TEMPLATE_FOLDER",
                folderId: createId(),
                name: folderName,
              });
              setFolderName("");
            }}
          >
            Add folder
          </button>
        </div>
        <div className="folder-chip-list">
          {state.templateFolders.map((folder) => (
            <span className="folder-chip" key={folder.id}>
              {folder.name}
              {state.templateFolders.length > 1 && (
                <button
                  type="button"
                  aria-label={`Delete ${folder.name} folder`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the “${folder.name}” folder? Its templates will remain in the library but will no longer belong to this folder.`,
                      )
                    ) {
                      sendCommand({ type: "DELETE_TEMPLATE_FOLDER", folderId: folder.id });
                    }
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className="event-list-section">
        <div className="catalog-section__subheading">
          <small>Ready to continue</small>
          <h2>Active events</h2>
        </div>
        <div className="event-card-grid">
          {activeEvents.map((event) => (
            <EventCard event={event} sendCommand={sendCommand} key={event.id} />
          ))}
          {activeEvents.length === 0 && (
            <p className="catalog-empty">No active events yet. Create the first one above.</p>
          )}
        </div>
      </section>

      {archivedEvents.length > 0 && (
        <section className="event-list-section event-list-section--archived">
          <div className="catalog-section__subheading">
            <small>Kept locally</small>
            <h2>Archived events</h2>
          </div>
          <div className="event-card-grid">
            {archivedEvents.map((event) => (
              <EventCard event={event} sendCommand={sendCommand} key={event.id} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function EventWorkspacePanel({
  state,
  cameraReady,
  sendCommand,
}: {
  state: BoothState;
  cameraReady: boolean;
  sendCommand: (command: Command) => void;
}) {
  const event = activeEventFor(state);
  const [customerName, setCustomerName] = useState("");
  if (!event) return null;

  return (
    <section className="event-workspace">
      <div className="event-workspace__heading">
        <div>
          <span className="eyebrow">Active event · {readableEventDate(event.eventDate)}</span>
          <h1>{event.name}</h1>
          <p>
            {event.clientName || "No client name"}
            {event.venue ? ` · ${event.venue}` : ""} · {event.templates.length} event template
            {event.templates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="event-workspace__heading-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={() => sendCommand({ type: "CLOSE_EVENT" })}
          >
            All events
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => sendCommand({ type: "ARCHIVE_EVENT", eventId: event.id })}
          >
            Archive event
          </button>
        </div>
      </div>

      <div className="event-workspace__setup">
        <ModeSelector value={state.operationMode} sendCommand={sendCommand} />
        <section className="next-session-card">
          <span className="eyebrow">Next customer</span>
          <h2>Start session {event.sessions.length + 1}</h2>
          <label>
            Customer or group name <small>Optional</small>
            <input
              type="text"
              maxLength={80}
              value={customerName}
              placeholder="Example: Santos family"
              onChange={(inputEvent) => setCustomerName(inputEvent.target.value)}
            />
          </label>
          <div className="next-session-card__actions">
            <button
              className="button button--primary button--large"
              type="button"
              disabled={!cameraReady}
              onClick={() =>
                sendCommand({
                  type: "BEGIN_SESSION",
                  sessionId: createId(),
                  customerName,
                })
              }
            >
              Start a new session
            </button>
            <button
              className="button button--quiet button--large"
              type="button"
              onClick={() => sendCommand({ type: "OPEN_TEMPLATE_GALLERY", scope: "event" })}
            >
              Manage event templates
            </button>
          </div>
          {!cameraReady && <p className="start-note">Enable the selected camera first.</p>}
        </section>
      </div>

      <section className="event-session-history">
        <div className="catalog-section__subheading">
          <small>Saved locally</small>
          <h2>Customer sessions</h2>
        </div>
        <div className="event-session-list">
          {[...event.sessions].reverse().map((session) => (
            <article className="event-session-card" key={session.id}>
              <div className="event-session-card__heading">
                <span>Session {session.number}</span>
                <strong>{session.customerName || `Guest session ${session.number}`}</strong>
                <small>{new Date(session.completedAt).toLocaleString("en-PH")}</small>
              </div>
              <div className="event-session-card__captures">
                {session.captures.map((capture) => (
                  <img
                    src={mediaSource(capture.mediaUrl)}
                    style={{ filter: photoFilterCss(capture.filterId) }}
                    alt={`Session ${session.number} capture ${capture.slot}`}
                    key={`${session.id}-${capture.slot}`}
                  />
                ))}
              </div>
              <div className="event-session-card__deliverables">
                {session.deliverables.map((deliverable) => (
                  <a
                    href={mediaSource(deliverable.mediaUrl)}
                    target="_blank"
                    rel="noreferrer"
                    key={deliverable.mediaUrl}
                  >
                    {deliverable.label}
                  </a>
                ))}
              </div>
              <div className="event-session-card__printing">
                <button
                  className="button button--primary button--tiny"
                  type="button"
                  disabled={
                    !session.deliverables.some((deliverable) => deliverable.kind === "print")
                  }
                  onClick={() => openPrintPreview(event.id, session.id)}
                >
                  Preview &amp; {session.printAttempts.length ? "reprint" : "print"}
                </button>
                <small>
                  {(session.printAttempts ?? []).length
                    ? `${(session.printAttempts ?? []).length} print ${(session.printAttempts ?? []).length === 1 ? "attempt" : "attempts"} recorded`
                    : "Not printed yet"}
                </small>
              </div>
              <p className="event-session-card__qr">
                QR delivery: waiting for the cloud-delivery milestone · future links expire after 30
                days.
              </p>
            </article>
          ))}
          {event.sessions.length === 0 && (
            <p className="catalog-empty">Completed customer sessions will appear here.</p>
          )}
        </div>
      </section>
    </section>
  );
}

function TemplateThumbnail({
  template,
  state,
  compact = false,
}: {
  template: SavedTemplate;
  state: BoothState;
  compact?: boolean;
}) {
  const layout = resolveLayout(template.layoutId, template.customSlots);
  const overlay = getOverlay(template.overlayId, state.customOverlays);
  if (!layout || overlay?.kind !== "custom") {
    return (
      <span className="saved-template-thumbnail saved-template-thumbnail--missing">Missing</span>
    );
  }

  const holderTransforms = holderTransformMap(template.holderTransforms);
  return (
    <span
      className="saved-template-thumbnail"
      style={{
        aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
        width: compact
          ? "70px"
          : layout.canvasHeight > layout.canvasWidth
            ? "min(100%, 170px)"
            : "100%",
      }}
      aria-hidden="true"
    >
      {layout.slots.map((slot) => {
        const captureSlot = slot.captureIndex + 1;
        const holderId = photoSlotId(slot);
        const transform = holderTransforms[holderId] ?? identityMediaTransform();
        return (
          <i key={holderId} style={holderStyle(slot, layout, transform)}>
            {captureSlot}
          </i>
        );
      })}
      <img
        src={mediaSource(overlay.mediaUrl)}
        style={transformStyle(template.frameTransform)}
        alt=""
      />
    </span>
  );
}

function TemplateGalleryPanel({
  state,
  sendCommand,
}: {
  state: BoothState;
  sendCommand: (command: Command) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = getProduct(productId);
  const [layoutId, setLayoutId] = useState(selectedProduct?.layoutIds[0] ?? "");
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(
    state.templateFolders[0] ? [state.templateFolders[0].id] : [],
  );
  const [promotion, setPromotion] = useState<{
    templateId: string;
    name: string;
    folderIds: string[];
  } | null>(null);
  const selectedLayout = getLayout(layoutId);
  const activeEvent = activeEventFor(state);
  const isEventGallery = state.templateGalleryScope === "event";
  const galleryTemplates = galleryTemplatesFor(state);
  const visibleTemplates =
    !isEventGallery && folderFilter !== "all"
      ? galleryTemplates.filter((template) => template.folderIds.includes(folderFilter))
      : galleryTemplates;
  const addableLibraryTemplates = isEventGallery
    ? state.savedTemplates.filter(
        (template) =>
          !activeEvent?.templates.some(
            (eventTemplate) => eventTemplate.sourceTemplateId === template.id,
          ),
      )
    : [];
  const compatibleArtwork = useMemo(
    () =>
      selectedLayout
        ? state.customOverlays.filter((overlay) =>
            overlaySupportsLayout(overlay, selectedLayout.id),
          )
        : [],
    [selectedLayout, state.customOverlays],
  );

  useEffect(() => {
    if (selectedProduct && !selectedProduct.layoutIds.includes(layoutId)) {
      setLayoutId(selectedProduct.layoutIds[0] ?? "");
      setOverlayId(null);
    }
  }, [layoutId, selectedProduct]);

  useEffect(() => {
    if (overlayId && !compatibleArtwork.some((overlay) => overlay.id === overlayId)) {
      setOverlayId(null);
    }
  }, [compatibleArtwork, overlayId]);

  const beginTemplate = () => {
    if (
      !selectedLayout ||
      !overlayId ||
      !name.trim() ||
      (!isEventGallery && selectedFolderIds.length === 0)
    )
      return;
    sendCommand({
      type: "BEGIN_TEMPLATE_CREATE",
      name: name.trim(),
      productId,
      layoutId: selectedLayout.id,
      overlayId,
      folderIds: isEventGallery ? [] : selectedFolderIds,
      ...(isCustomLayoutId(selectedLayout.id) ? { initialHolderId: createId() } : {}),
    });
  };

  return (
    <section className="template-gallery-stage">
      <div className="section-heading section-heading--horizontal">
        <div>
          <span className="eyebrow">{isEventGallery ? "Event setup" : "Reusable library"}</span>
          <h1>
            {isEventGallery ? `${activeEvent?.name ?? "Event"} Templates` : "Template Library"}
          </h1>
          <p>
            {isEventGallery
              ? "Changes here stay inside this event. Completed customer sessions remain unchanged."
              : "Organize master templates into folders, then copy them into event workspaces."}
          </p>
        </div>
        <button
          className="button button--quiet"
          type="button"
          onClick={() => sendCommand({ type: "CLOSE_TEMPLATE_GALLERY" })}
        >
          {isEventGallery ? "Back to event" : "Back to events"}
        </button>
      </div>

      <section className="saved-template-library">
        <div className="catalog-section__subheading">
          <small>{isEventGallery ? "Available at this event" : "Reusable masters"}</small>
          <h2>{isEventGallery ? "Event templates" : "Saved templates"}</h2>
        </div>
        {!isEventGallery && (
          <fieldset className="folder-filter">
            <legend>Filter templates by folder</legend>
            <button
              type="button"
              aria-pressed={folderFilter === "all"}
              onClick={() => setFolderFilter("all")}
            >
              All templates
            </button>
            {state.templateFolders.map((folder) => (
              <button
                type="button"
                aria-pressed={folderFilter === folder.id}
                onClick={() => setFolderFilter(folder.id)}
                key={folder.id}
              >
                {folder.name}
              </button>
            ))}
          </fieldset>
        )}
        <div className="saved-template-grid">
          {visibleTemplates.map((template) => {
            const layout = resolveLayout(template.layoutId, template.customSlots);
            return (
              <article className="saved-template-card" key={template.id}>
                <TemplateThumbnail template={template} state={state} />
                <div className="saved-template-card__copy">
                  <strong>{template.name}</strong>
                  <small>
                    {layout?.name ?? "Missing layout"} · {layout?.requiredCaptureCount ?? "?"}{" "}
                    photos
                  </small>
                </div>
                <div className="saved-template-card__actions">
                  <button
                    className="button button--primary button--tiny"
                    type="button"
                    onClick={() =>
                      sendCommand({ type: "BEGIN_TEMPLATE_EDIT", templateId: template.id })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="button button--danger button--tiny"
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${template.name}” from the Template Gallery? The uploaded artwork will remain available.`,
                        )
                      ) {
                        sendCommand({ type: "DELETE_TEMPLATE", templateId: template.id });
                      }
                    }}
                  >
                    Delete
                  </button>
                  {isEventGallery && (
                    <button
                      className="button button--quiet button--tiny"
                      type="button"
                      onClick={() =>
                        setPromotion({
                          templateId: template.id,
                          name: template.name,
                          folderIds: state.templateFolders[0] ? [state.templateFolders[0].id] : [],
                        })
                      }
                    >
                      Save to Library
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {visibleTemplates.length === 0 && (
            <p className="catalog-empty">
              {isEventGallery
                ? "No templates are available in this event yet."
                : "No reusable templates are in this folder yet."}
            </p>
          )}
        </div>
        {promotion && (
          <div className="template-promotion-panel">
            <div>
              <span className="eyebrow">Create reusable master</span>
              <h3>Save this event version to the Template Library</h3>
            </div>
            <label>
              Template name
              <input
                type="text"
                maxLength={80}
                value={promotion.name}
                onChange={(event) =>
                  setPromotion((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
              />
            </label>
            <fieldset className="folder-checkboxes">
              <legend>Save to folder(s)</legend>
              {state.templateFolders.map((folder) => (
                <label key={folder.id}>
                  <input
                    type="checkbox"
                    checked={promotion.folderIds.includes(folder.id)}
                    onChange={(event) =>
                      setPromotion((current) =>
                        current
                          ? {
                              ...current,
                              folderIds: event.target.checked
                                ? [...current.folderIds, folder.id]
                                : current.folderIds.filter((folderId) => folderId !== folder.id),
                            }
                          : current,
                      )
                    }
                  />
                  {folder.name}
                </label>
              ))}
            </fieldset>
            <div className="template-promotion-panel__actions">
              <button
                className="button button--quiet"
                type="button"
                onClick={() => setPromotion(null)}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                type="button"
                disabled={!promotion.name.trim() || promotion.folderIds.length === 0}
                onClick={() => {
                  sendCommand({
                    type: "SAVE_EVENT_TEMPLATE_TO_LIBRARY",
                    templateId: promotion.templateId,
                    libraryTemplateId: createId(),
                    name: promotion.name,
                    folderIds: promotion.folderIds,
                  });
                  setPromotion(null);
                }}
              >
                Save reusable copy
              </button>
            </div>
          </div>
        )}
      </section>

      {isEventGallery && (
        <section className="event-template-importer">
          <div className="catalog-section__subheading">
            <small>From other folders</small>
            <h2>Add a Template Library design</h2>
          </div>
          <div className="event-template-importer__list">
            {addableLibraryTemplates.map((template) => (
              <button
                className="event-template-importer__item"
                type="button"
                onClick={() => sendCommand({ type: "ADD_EVENT_TEMPLATE", templateId: template.id })}
                key={template.id}
              >
                <TemplateThumbnail template={template} state={state} compact />
                <span>
                  <strong>{template.name}</strong>
                  <small>Add an event-only copy</small>
                </span>
              </button>
            ))}
            {addableLibraryTemplates.length === 0 && (
              <p className="catalog-empty">Every library template is already in this event.</p>
            )}
          </div>
        </section>
      )}

      <section className="template-creator">
        <div className="catalog-section__subheading">
          <small>New reusable template</small>
          <h2>Choose the layout and artwork</h2>
        </div>
        <label className="template-name-field">
          Template name
          <input
            type="text"
            maxLength={80}
            value={name}
            placeholder="Example: Birthday Blue Double Strip"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {!isEventGallery && (
          <fieldset className="folder-checkboxes folder-checkboxes--creator">
            <legend>Save to folder(s)</legend>
            {state.templateFolders.map((folder) => (
              <label key={folder.id}>
                <input
                  type="checkbox"
                  checked={selectedFolderIds.includes(folder.id)}
                  onChange={(event) =>
                    setSelectedFolderIds((current) =>
                      event.target.checked
                        ? [...current, folder.id]
                        : current.filter((folderId) => folderId !== folder.id),
                    )
                  }
                />
                {folder.name}
              </label>
            ))}
          </fieldset>
        )}
        <div className="product-grid product-grid--compact">
          {products.map((product) => (
            <button
              className={`catalog-card ${
                productId === product.id ? "catalog-card--selected" : ""
              } ${product.templateOnly ? "catalog-card--custom-product" : ""}`}
              type="button"
              key={product.id}
              onClick={() => {
                setProductId(product.id);
                setLayoutId(product.layoutIds[0] ?? "");
                setOverlayId(null);
              }}
            >
              <strong>{product.name}</strong>
              <span>{product.description}</span>
            </button>
          ))}
        </div>
        <div className="template-layout-heading">
          <small>{isCustomLayoutId(layoutId) ? "Canvas orientation" : "Photo arrangement"}</small>
          <h3>
            {isCustomLayoutId(layoutId)
              ? "Choose portrait or landscape"
              : "Choose the photo layout"}
          </h3>
        </div>
        <div
          className={`layout-grid layout-grid--compact ${
            isCustomLayoutId(layoutId) ? "layout-grid--orientation" : ""
          }`}
        >
          {(selectedProduct?.layoutIds ?? [])
            .map((id) => getLayout(id))
            .filter((layout): layout is Layout => Boolean(layout))
            .map((layout) => (
              <button
                className={`layout-card ${
                  layoutId === layout.id ? "layout-card--selected" : ""
                } ${isCustomLayoutId(layout.id) ? "layout-card--orientation" : ""}`}
                type="button"
                key={layout.id}
                onClick={() => {
                  setLayoutId(layout.id);
                  setOverlayId(null);
                }}
              >
                <LayoutThumbnail layout={layout} />
                <span>
                  <strong>{layout.name}</strong>
                  <small>
                    {isCustomLayoutId(layout.id)
                      ? "Add up to 8 holders"
                      : `${layout.requiredCaptureCount} placeholders`}
                  </small>
                </span>
              </button>
            ))}
        </div>

        {selectedLayout && (
          <>
            <div className="catalog-section__subheading">
              <small>Frame artwork</small>
              <h3>Choose an upload or add a new transparent PNG</h3>
            </div>
            <div className="overlay-grid">
              {compatibleArtwork.map((overlay) => (
                <div className="overlay-choice" key={overlay.id}>
                  <button
                    className={
                      overlayId === overlay.id
                        ? "overlay-card overlay-card--selected"
                        : "overlay-card"
                    }
                    type="button"
                    onClick={() => setOverlayId(overlay.id)}
                  >
                    <OverlayThumbnail overlay={overlay} />
                    <span>
                      <strong>{overlay.name}</strong>
                      <small>Uploaded artwork</small>
                    </span>
                  </button>
                  <DeleteImportedOverlayButton overlay={overlay} />
                </div>
              ))}
              {compatibleArtwork.length === 0 && (
                <p className="catalog-empty">Upload artwork for this layout to continue.</p>
              )}
            </div>
            <OverlayImporter
              key={selectedLayout.id}
              layout={selectedLayout}
              onImported={setOverlayId}
            />
          </>
        )}

        <div className="template-creator__footer">
          <p>The next screen uses numbered sample photos so you can align every opening.</p>
          <button
            className="button button--primary button--large"
            type="button"
            disabled={
              !name.trim() ||
              !selectedLayout ||
              !overlayId ||
              (!isEventGallery && selectedFolderIds.length === 0)
            }
            onClick={beginTemplate}
          >
            Open template setup
          </button>
        </div>
      </section>
    </section>
  );
}

function TemplateEditorPanel({
  state,
  sendCommand,
}: {
  state: BoothState;
  sendCommand: (command: Command) => void;
}) {
  const editor = state.templateEditor;
  const sourceTemplate = editor?.sourceTemplateId
    ? galleryTemplatesFor(state).find((template) => template.id === editor.sourceTemplateId)
    : null;
  const [name, setName] = useState(editor?.startingName ?? "");
  const [folderIds, setFolderIds] = useState(editor?.startingFolderIds ?? []);
  const customLayout = isCustomLayoutId(state.layoutId);
  const customSlots = state.customSlots ?? [];
  const captureChoices = Array.from(
    { length: Math.min(MAX_CUSTOM_HOLDERS, state.requiredCaptureCount + 1) },
    (_, index) => index + 1,
  );

  useEffect(() => setName(editor?.startingName ?? ""), [editor?.startingName]);
  useEffect(() => setFolderIds(editor?.startingFolderIds ?? []), [editor?.startingFolderIds]);

  if (!editor) return null;

  const saveTemplate = (templateId: string) => {
    if (!name.trim() || (state.templateGalleryScope === "library" && folderIds.length === 0))
      return;
    sendCommand({ type: "SAVE_TEMPLATE", templateId, name: name.trim(), folderIds });
  };

  return (
    <section className="template-editor-stage">
      <div className="section-heading section-heading--horizontal">
        <div>
          <span className="eyebrow">Reusable setup</span>
          <h1>Place the photo placeholders once.</h1>
          <p>Every future capture will enter these saved positions automatically.</p>
        </div>
        <button
          className="button button--quiet"
          type="button"
          onClick={() => sendCommand({ type: "CANCEL_TEMPLATE_EDIT" })}
        >
          Cancel
        </button>
      </div>
      <label className="template-name-field">
        Template name
        <input
          type="text"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {state.templateGalleryScope === "library" && (
        <fieldset className="folder-checkboxes folder-checkboxes--creator">
          <legend>Save to folder(s)</legend>
          {state.templateFolders.map((folder) => (
            <label key={folder.id}>
              <input
                type="checkbox"
                checked={folderIds.includes(folder.id)}
                onChange={(event) =>
                  setFolderIds((current) =>
                    event.target.checked
                      ? [...current, folder.id]
                      : current.filter((folderId) => folderId !== folder.id),
                  )
                }
              />
              {folder.name}
            </label>
          ))}
        </fieldset>
      )}
      {customLayout && (
        <section className="holder-mapping-panel" aria-labelledby="holder-mapping-title">
          <div className="holder-mapping-panel__heading">
            <div>
              <span>Custom photo map</span>
              <h2 id="holder-mapping-title">Choose which capture fills each holder.</h2>
              <p>
                Reuse a capture in multiple holders, or assign a new capture. The booth will take
                only {state.requiredCaptureCount} photo{state.requiredCaptureCount === 1 ? "" : "s"}
                .
              </p>
            </div>
            <button
              className="button button--dark"
              type="button"
              disabled={customSlots.length >= MAX_CUSTOM_HOLDERS}
              onClick={() => sendCommand({ type: "ADD_TEMPLATE_HOLDER", holderId: createId() })}
            >
              {customSlots.length >= MAX_CUSTOM_HOLDERS
                ? "8-holder limit reached"
                : "Add photo holder"}
            </button>
          </div>
          <div className="holder-mapping-list">
            {customSlots.map((slot, index) => {
              const holderId = photoSlotId(slot);
              return (
                <div className="holder-mapping-row" key={holderId}>
                  <strong>Holder {index + 1}</strong>
                  <label>
                    Fill with
                    <select
                      value={slot.captureIndex + 1}
                      onChange={(event) =>
                        sendCommand({
                          type: "SET_TEMPLATE_HOLDER_CAPTURE",
                          holderId,
                          captureSlot: Number(event.target.value),
                        })
                      }
                    >
                      {captureChoices.map((captureSlot) => (
                        <option value={captureSlot} key={captureSlot}>
                          Capture {captureSlot}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button button--danger button--tiny"
                    type="button"
                    disabled={customSlots.length === 1}
                    onClick={() => sendCommand({ type: "REMOVE_TEMPLATE_HOLDER", holderId })}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <p className="holder-mapping-panel__summary">
            {customSlots.length} of {MAX_CUSTOM_HOLDERS} holders · {state.requiredCaptureCount}{" "}
            unique capture{state.requiredCaptureCount === 1 ? "" : "s"}
          </p>
        </section>
      )}
      <div className="template-editor-stage__canvas">
        <LayoutPreview state={state} editable sendCommand={sendCommand} context="template" />
      </div>
      <div className="template-editor-stage__footer">
        <p>
          {state.templateGalleryScope === "event"
            ? "Changes stay inside this event. Save as new creates another event-only version."
            : "Save changes updates this library item everywhere it is listed. Save as new keeps the original."}
        </p>
        <div className="template-editor-stage__actions">
          {sourceTemplate && (
            <button
              className="button button--quiet button--large"
              type="button"
              disabled={
                !name.trim() || (state.templateGalleryScope === "library" && folderIds.length === 0)
              }
              onClick={() => saveTemplate(sourceTemplate.id)}
            >
              Save changes
            </button>
          )}
          <button
            className="button button--primary button--large"
            type="button"
            disabled={
              !name.trim() || (state.templateGalleryScope === "library" && folderIds.length === 0)
            }
            onClick={() => saveTemplate(createId())}
          >
            {sourceTemplate ? "Save as new" : "Save template"}
          </button>
        </div>
      </div>
    </section>
  );
}

function LiveCameraPreview({ state }: { state: BoothState }) {
  const countdown = state.phase === "countdown" ? state.captureSequence?.remaining : null;
  const isRetake = state.captureSequence?.kind === "retake";
  const activeSlot =
    state.captureSequence?.kind === "retake"
      ? state.captureSequence.slot
      : state.captures.length + 1;

  return (
    <section
      className={`live-camera ${state.cameraSourceId === "simulator" ? "live-camera--simulator" : ""}`}
      aria-label="Live camera preview"
    >
      {state.cameraSourceId === "macbook_camera" ? (
        <img src={`${hostHttpUrl}/api/camera-preview`} alt="Mirrored live camera preview" />
      ) : (
        <div className="live-camera__simulator">
          <span>TEST</span>
          <strong>Camera simulator</strong>
        </div>
      )}
      <div className="live-camera__guide" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="live-camera__badge">
        {state.cameraSourceId === "macbook_camera" ? "Mirrored preview" : "Synthetic preview"}
      </span>
      {countdown && (
        <div className="countdown-overlay" role="status" aria-live="assertive">
          <small>
            {isRetake
              ? `Retake photo ${activeSlot}`
              : `Photo ${activeSlot} of ${state.requiredCaptureCount}`}
          </small>
          <strong key={`${activeSlot}-${countdown}`}>{countdown}</strong>
          <span>Look at the camera</span>
        </div>
      )}
      {state.phase === "capturing" && (
        <div className="capture-flash" role="status">
          <strong>Smile!</strong>
        </div>
      )}
    </section>
  );
}

function SelectionPanel({
  state,
  interactive,
  isOperator,
  sendCommand,
}: {
  state: BoothState;
  interactive: boolean;
  isOperator: boolean;
  sendCommand: (command: Command) => void;
}) {
  const selectedProduct = getProduct(state.productId);
  const selectedLayout = resolveLayout(state.layoutId, state.customSlots);
  const manualSelectionEnabled = !selectedProduct?.templateOnly;
  const availableLayouts =
    selectedProduct && manualSelectionEnabled
      ? selectedProduct.layoutIds
          .map((layoutId) => layouts.find((layout) => layout.id === layoutId))
          .filter((layout): layout is Layout => Boolean(layout))
      : [];
  const availableBuiltInOverlays = selectedLayout
    ? overlays.filter((overlay) => overlaySupportsLayout(overlay, selectedLayout.id))
    : [];
  const availableCustomOverlays = selectedLayout
    ? state.customOverlays.filter((overlay) => overlaySupportsLayout(overlay, selectedLayout.id))
    : [];
  const selectedOverlay = getOverlay(state.overlayId, state.customOverlays);
  const validFrame =
    (state.frameMode === "color" &&
      Boolean(state.designId) &&
      Boolean(selectedOverlay && selectedOverlay.kind !== "custom")) ||
    (state.frameMode === "custom" && selectedOverlay?.kind === "custom");
  const canSubmit = Boolean(
    state.productId && state.layoutId && validFrame && state.consentRecorded,
  );
  const approvedTemplates = sessionTemplatesFor(state).filter((template) => template.approved);

  if (!interactive) {
    return (
      <section className="customer-message">
        <span className="eyebrow">Attendant-operated session</span>
        <h1>We’ll set everything up for you.</h1>
        <p>
          Your attendant is choosing the layout, frame, and overlay. You’ll see each photo here.
        </p>
        <div className="waiting-dots" role="status" aria-label="Waiting">
          <i />
          <i />
          <i />
        </div>
      </section>
    );
  }

  return (
    <section className="selection-panel">
      <div className="section-heading">
        <span className="eyebrow">Build your photo keepsake</span>
        <h1>Choose a ready template or build your own.</h1>
        <p>
          Saved templates already know where every photo belongs. You can still choose a product,
          layout, and frame manually below.
        </p>
      </div>

      {approvedTemplates.length > 0 && (
        <div className="catalog-section catalog-section--templates">
          <div className="catalog-section__heading">
            <span className="choice-summary__number">★</span>
            <div>
              <small>Fastest option</small>
              <h2>Template Gallery</h2>
            </div>
          </div>
          <p className="catalog-section__intro">
            Pick a prepared design. Your captures will automatically fill its numbered photo
            positions.
          </p>
          <div className="saved-template-grid saved-template-grid--selectable">
            {approvedTemplates.map((template) => {
              const layout = resolveLayout(template.layoutId, template.customSlots);
              return (
                <button
                  className={
                    state.selectedTemplateId === template.id
                      ? "saved-template-card saved-template-card--selected"
                      : "saved-template-card"
                  }
                  type="button"
                  key={template.id}
                  onClick={() => sendCommand({ type: "SELECT_TEMPLATE", templateId: template.id })}
                >
                  <TemplateThumbnail template={template} state={state} />
                  <span className="saved-template-card__copy">
                    <strong>{template.name}</strong>
                    <small>
                      {layout?.name ?? "Missing layout"} · {layout?.requiredCaptureCount ?? "?"}{" "}
                      photos
                    </small>
                  </span>
                  <span className="saved-template-card__ready">
                    {state.selectedTemplateId === template.id ? "Selected" : "Use template"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="catalog-divider">
            <span>or build manually</span>
          </div>
        </div>
      )}

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">01</span>
          <div>
            <small>Product</small>
            <h2>Choose the photo experience</h2>
          </div>
        </div>
        <div className="product-grid">
          {products
            .filter((product) => !product.templateOnly)
            .map((product) => (
              <button
                className={
                  state.productId === product.id
                    ? "catalog-card catalog-card--selected"
                    : "catalog-card"
                }
                type="button"
                key={product.id}
                onClick={() => sendCommand({ type: "SELECT_PRODUCT", productId: product.id })}
              >
                <strong>{product.name}</strong>
                <span>{product.description}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">02</span>
          <div>
            <small>Layout</small>
            <h2>Choose how the photos are arranged</h2>
          </div>
        </div>
        <div className="layout-grid">
          {availableLayouts.map((layout) => (
            <button
              className={
                state.layoutId === layout.id ? "layout-card layout-card--selected" : "layout-card"
              }
              type="button"
              key={layout.id}
              onClick={() => sendCommand({ type: "SELECT_LAYOUT", layoutId: layout.id })}
            >
              <LayoutThumbnail layout={layout} />
              <span>
                <strong>{layout.name}</strong>
                <small>
                  {layout.requiredCaptureCount} photos · {layout.description}
                </small>
              </span>
            </button>
          ))}
          {!selectedProduct && <p className="catalog-empty">Choose a product first.</p>}
          {selectedProduct?.templateOnly && (
            <p className="catalog-empty">
              This custom layout is already prepared inside the selected saved template.
            </p>
          )}
        </div>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">03</span>
          <div>
            <small>Frame</small>
            <h2>Choose one frame type</h2>
          </div>
        </div>
        {selectedProduct?.templateOnly ? (
          <p className="catalog-empty">
            The selected template already includes its imported frame and holder placements.
          </p>
        ) : (
          <div className="frame-mode-grid">
            <button
              className={
                state.frameMode === "color" ? "frame-mode frame-mode--selected" : "frame-mode"
              }
              type="button"
              disabled={!state.layoutId}
              onClick={() => sendCommand({ type: "SELECT_FRAME_MODE", frameMode: "color" })}
            >
              <span className="frame-mode__swatches" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>Fixed colored frame</strong>
              <small>Choose a WanderBooth color and an optional built-in decoration.</small>
            </button>
            <button
              className={
                state.frameMode === "custom" ? "frame-mode frame-mode--selected" : "frame-mode"
              }
              type="button"
              disabled={!state.layoutId}
              onClick={() => sendCommand({ type: "SELECT_FRAME_MODE", frameMode: "custom" })}
            >
              <span className="frame-mode__import" aria-hidden="true">
                ↑
              </span>
              <strong>Imported custom frame</strong>
              <small>Use event artwork instead of a WanderBooth frame color.</small>
            </button>
          </div>
        )}

        {manualSelectionEnabled && state.frameMode === "color" && (
          <div className="frame-options">
            <div className="catalog-section__subheading">
              <small>Color</small>
              <h3>Choose a fixed color</h3>
            </div>
            <div className="design-grid design-grid--frames">
              {designs.map((design) => (
                <button
                  className={
                    state.designId === design.id
                      ? "design-card design-card--selected"
                      : "design-card"
                  }
                  style={
                    {
                      "--accent": design.accent,
                      "--background": design.background,
                    } as React.CSSProperties
                  }
                  type="button"
                  key={design.id}
                  onClick={() => sendCommand({ type: "SELECT_DESIGN", designId: design.id })}
                >
                  <span className="design-card__preview">
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{design.name}</strong>
                  <small>{design.description}</small>
                </button>
              ))}
            </div>
            <div className="catalog-section__subheading">
              <small>Decoration</small>
              <h3>Add an optional built-in detail</h3>
            </div>
            <div className="overlay-grid">
              {availableBuiltInOverlays.map((overlay) => (
                <button
                  className={
                    state.overlayId === overlay.id
                      ? "overlay-card overlay-card--selected"
                      : "overlay-card"
                  }
                  type="button"
                  key={overlay.id}
                  disabled={!state.designId}
                  onClick={() => sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })}
                >
                  <OverlayThumbnail overlay={overlay} />
                  <span>
                    <strong>{overlay.name}</strong>
                    <small>{overlay.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {manualSelectionEnabled && state.frameMode === "custom" && selectedLayout && (
          <div className="frame-options">
            <div className="catalog-section__subheading">
              <small>Custom frame</small>
              <h3>Choose imported artwork</h3>
            </div>
            <div className="overlay-grid">
              {availableCustomOverlays.map((overlay) => (
                <div className="overlay-choice" key={overlay.id}>
                  <button
                    className={
                      state.overlayId === overlay.id
                        ? "overlay-card overlay-card--selected"
                        : "overlay-card"
                    }
                    type="button"
                    onClick={() => sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })}
                  >
                    <OverlayThumbnail overlay={overlay} />
                    <span>
                      <strong>{overlay.name}</strong>
                      <small>{overlay.description}</small>
                    </span>
                  </button>
                  <DeleteImportedOverlayButton overlay={overlay} />
                </div>
              ))}
              {availableCustomOverlays.length === 0 && (
                <p className="catalog-empty">
                  No custom frames have been imported for this layout yet.
                </p>
              )}
            </div>
            {isOperator && (
              <OverlayImporter
                key={selectedLayout.id}
                layout={selectedLayout}
                onImported={(overlayId) => sendCommand({ type: "SELECT_OVERLAY", overlayId })}
              />
            )}
          </div>
        )}
      </div>

      <div className="consent-row">
        <button
          className={state.consentRecorded ? "consent consent--checked" : "consent"}
          type="button"
          disabled={!validFrame}
          onClick={() => sendCommand({ type: "RECORD_CONSENT" })}
        >
          <span aria-hidden="true">{state.consentRecorded ? "✓" : ""}</span>I agree to have these
          photos processed for this session.
        </button>
        <button
          className="button button--primary button--large"
          type="button"
          disabled={!canSubmit}
          onClick={() => sendCommand({ type: "SUBMIT_SELECTION" })}
        >
          Continue to cash confirmation
        </button>
      </div>
    </section>
  );
}

function SessionPanel({
  state,
  interactive,
  isOperator,
  sendCommand,
}: {
  state: BoothState;
  interactive: boolean;
  isOperator: boolean;
  sendCommand: (command: Command) => void;
}) {
  if (state.phase === "template_gallery") {
    return isOperator ? (
      <TemplateGalleryPanel state={state} sendCommand={sendCommand} />
    ) : (
      <section className="customer-message">
        <span className="eyebrow">Staff setup</span>
        <h1>Your attendant is preparing the Template Gallery.</h1>
        <p>The next guest session will appear here when setup is finished.</p>
      </section>
    );
  }

  if (state.phase === "template_editing") {
    return isOperator ? (
      <TemplateEditorPanel state={state} sendCommand={sendCommand} />
    ) : (
      <section className="customer-message">
        <span className="eyebrow">Staff setup</span>
        <h1>Your attendant is aligning a reusable template.</h1>
        <p>Numbered placeholders on the Mac will become real photos during each session.</p>
      </section>
    );
  }

  if (state.phase === "selecting") {
    return (
      <SelectionPanel
        state={state}
        interactive={interactive}
        isOperator={isOperator}
        sendCommand={sendCommand}
      />
    );
  }

  if (state.phase === "awaiting_cash") {
    return (
      <section className="center-stage">
        <span className="cash-icon" aria-hidden="true">
          ₱
        </span>
        <span className="eyebrow">Cash payment</span>
        <h1>
          {isOperator ? "Confirm payment when cash is received." : "Please see your attendant."}
        </h1>
        <p>No amount is displayed in this prototype. Use the physical menu for pricing.</p>
        {isOperator && (
          <button
            className="button button--primary button--large"
            type="button"
            onClick={() => sendCommand({ type: "CONFIRM_CASH" })}
          >
            Cash received · Continue
          </button>
        )}
      </section>
    );
  }

  if (["ready", "countdown", "capturing"].includes(state.phase)) {
    const isRetake = state.captureSequence?.kind === "retake";
    const nextPhoto =
      state.captureSequence?.kind === "retake"
        ? state.captureSequence.slot
        : state.captures.length + 1;
    const photosRemaining = Math.max(0, state.requiredCaptureCount - state.captures.length);
    const heading =
      state.phase === "ready"
        ? `One tap takes all ${state.requiredCaptureCount} photos.`
        : state.phase === "countdown"
          ? "Get ready…"
          : "Hold that pose…";
    return (
      <section className="capture-stage capture-stage--live">
        <div className="capture-stage__copy">
          <span className="eyebrow">
            {isRetake
              ? `Retake photo ${nextPhoto}`
              : `Photo ${Math.min(nextPhoto, state.requiredCaptureCount)} of ${state.requiredCaptureCount}`}
          </span>
          <h1>{heading}</h1>
          <p>
            {state.phase === "ready"
              ? "There is a three-second countdown before each photo, with a short pause between shots."
              : "Stay inside the guide. The saved photo is not mirrored."}
          </p>
          {interactive && state.phase === "ready" && (
            <button
              className="shutter"
              type="button"
              onClick={() => sendCommand({ type: "START_CAPTURE_SEQUENCE" })}
            >
              <span aria-hidden="true" />
              Start {photosRemaining}-photo sequence
            </button>
          )}
        </div>
        <div className="capture-stage__visual">
          <LiveCameraPreview state={state} />
          {state.captures.length > 0 && <CapturePreview state={state} />}
        </div>
      </section>
    );
  }

  if (state.phase === "reviewing") {
    const reviewOverlay = getOverlay(state.overlayId, state.customOverlays);
    const reviewFrameValid =
      (state.frameMode === "color" &&
        Boolean(state.designId) &&
        Boolean(reviewOverlay && reviewOverlay.kind !== "custom")) ||
      (state.frameMode === "custom" && reviewOverlay?.kind === "custom");
    const compatibleBuiltIns = overlays.filter(
      (overlay) => Boolean(state.layoutId) && overlaySupportsLayout(overlay, state.layoutId ?? ""),
    );
    const compatibleCustomFrames = state.customOverlays.filter(
      (overlay) => Boolean(state.layoutId) && overlaySupportsLayout(overlay, state.layoutId ?? ""),
    );
    const compatibleTemplates = sessionTemplatesFor(state).filter(
      (template) => template.approved && template.layoutId === state.layoutId,
    );
    return (
      <section className="review-stage">
        <div className="section-heading section-heading--horizontal">
          <div>
            <span className="eyebrow">Review</span>
            <h1>Review the finished layout.</h1>
          </div>
          <p>{state.retakesRemaining} retakes remaining</p>
        </div>
        <div className="review-workspace">
          <LayoutPreview
            state={state}
            editable={isOperator && state.frameMode === "custom"}
            sendCommand={sendCommand}
          />
          <section className="source-review">
            <div className="source-review__heading">
              <span>Captured photos</span>
              <small>Full images · not cropped</small>
            </div>
            <CapturePreview state={state} compact />
            {interactive && <PhotoFilterPicker state={state} sendCommand={sendCommand} />}
            {interactive && (
              <div
                className="retake-row"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(state.captures.length, 4)}, minmax(0, 1fr))`,
                }}
              >
                {state.captures.map((capture) => (
                  <button
                    className="button button--quiet"
                    type="button"
                    disabled={state.retakesRemaining === 0}
                    key={capture.slot}
                    onClick={() => sendCommand({ type: "RETAKE", slot: capture.slot })}
                  >
                    Retake photo {capture.slot}
                  </button>
                ))}
              </div>
            )}
            {!interactive && (
              <div className="customer-message customer-message--compact">
                <p>Tell your attendant if you’d like to replace a photo.</p>
              </div>
            )}
          </section>
        </div>
        {interactive ? (
          <>
            {compatibleTemplates.length > 0 && (
              <section className="review-template-picker">
                <div className="review-frame-settings__heading">
                  <span>Saved templates</span>
                  <small>Apply a prepared alignment for this layout in one tap.</small>
                </div>
                <div className="saved-template-grid saved-template-grid--review">
                  {compatibleTemplates.map((template) => (
                    <button
                      className={
                        state.selectedTemplateId === template.id
                          ? "saved-template-card saved-template-card--selected"
                          : "saved-template-card"
                      }
                      type="button"
                      key={template.id}
                      onClick={() =>
                        sendCommand({ type: "SELECT_TEMPLATE", templateId: template.id })
                      }
                    >
                      <TemplateThumbnail template={template} state={state} />
                      <span className="saved-template-card__copy">
                        <strong>{template.name}</strong>
                        <small>
                          {state.selectedTemplateId === template.id
                            ? "Applied to this session"
                            : "Apply saved positions"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="review-frame-settings">
              <div className="review-frame-settings__heading">
                <span>Frame choice</span>
                <small>Color and imported frames cannot be combined.</small>
              </div>
              <div className="review-frame-settings__modes">
                <button
                  type="button"
                  aria-pressed={state.frameMode === "color"}
                  onClick={() => sendCommand({ type: "SELECT_FRAME_MODE", frameMode: "color" })}
                >
                  Fixed color
                </button>
                <button
                  type="button"
                  aria-pressed={state.frameMode === "custom"}
                  onClick={() => sendCommand({ type: "SELECT_FRAME_MODE", frameMode: "custom" })}
                >
                  Imported frame
                </button>
              </div>
              {state.frameMode === "color" && (
                <div className="review-frame-settings__choices">
                  <div className="mini-designs">
                    <span>Color</span>
                    {designs.map((design) => (
                      <button
                        type="button"
                        key={design.id}
                        title={design.name}
                        aria-label={`Use ${design.name}`}
                        aria-pressed={state.designId === design.id}
                        style={{ background: design.background, borderColor: design.accent }}
                        onClick={() => sendCommand({ type: "SELECT_DESIGN", designId: design.id })}
                      />
                    ))}
                  </div>
                  <div className="mini-overlays">
                    <span>Detail</span>
                    {compatibleBuiltIns.map((overlay) => (
                      <button
                        type="button"
                        key={overlay.id}
                        title={overlay.name}
                        aria-label={`Use ${overlay.name}`}
                        aria-pressed={state.overlayId === overlay.id}
                        onClick={() =>
                          sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })
                        }
                      >
                        <OverlayThumbnail overlay={overlay} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {state.frameMode === "custom" && (
                <div className="mini-overlays mini-overlays--custom">
                  <span>Imported</span>
                  {compatibleCustomFrames.map((overlay) => (
                    <div className="mini-overlay-choice" key={overlay.id}>
                      <button
                        type="button"
                        title={overlay.name}
                        aria-label={`Use ${overlay.name}`}
                        aria-pressed={state.overlayId === overlay.id}
                        onClick={() =>
                          sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })
                        }
                      >
                        <OverlayThumbnail overlay={overlay} />
                      </button>
                      <DeleteImportedOverlayButton overlay={overlay} compact />
                    </div>
                  ))}
                  {compatibleCustomFrames.length === 0 && (
                    <small>No imported frames for this layout.</small>
                  )}
                </div>
              )}
            </section>
            <div className="review-footer">
              <p>The final download and print use this exact layout and alignment.</p>
              <button
                className="button button--primary button--large"
                type="button"
                disabled={!reviewFrameValid}
                onClick={() => sendCommand({ type: "APPROVE" })}
              >
                Approve and make my set
              </button>
            </div>
          </>
        ) : (
          <p className="review-readonly-note">
            Your attendant can adjust the frame and photo positions before approval.
          </p>
        )}
      </section>
    );
  }

  if (state.phase === "processing") {
    return (
      <section className="center-stage">
        <div className="processing-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="eyebrow">Nearly there</span>
        <h1>Making the branded photos, keepsake, and slideshow.</h1>
        <p>Everything is rendered on this Mac for the offline-first prototype.</p>
      </section>
    );
  }

  if (state.phase === "complete") {
    const currentEvent = activeEventFor(state);
    const printDeliverable = state.deliverables.find((deliverable) => deliverable.kind === "print");
    return (
      <section className="delivery-stage">
        <div className="section-heading">
          <span className="eyebrow">Session complete</span>
          <h1>Your WanderBooth set is ready.</h1>
          <p>
            These links are local to the booth. The private 30-day cloud QR page is the next
            delivery milestone.
          </p>
        </div>
        {isOperator && currentEvent && state.sessionId && printDeliverable && (
          <section className="print-ready-card">
            <div>
              <span className="eyebrow">
                {state.operationMode === "self_service" ? "Guest is ready" : "Operator printing"}
              </span>
              <h2>Preview the exact 4×6 sheet, then choose the printer.</h2>
              <p>
                The native print dialog lets you choose the Epson L8050 or any printer installed on
                this computer. A 2×6 design is duplicated across a 4×6 sheet for cutting.
              </p>
            </div>
            <button
              className="button button--primary button--large"
              type="button"
              onClick={() => openPrintPreview(currentEvent.id, state.sessionId ?? "")}
            >
              Preview &amp; print
            </button>
          </section>
        )}
        {!isOperator && state.operationMode === "self_service" && (
          <div className="customer-message customer-message--compact">
            <p>Your photos are ready. Your attendant has been notified to print them.</p>
          </div>
        )}
        <div className="deliverable-grid">
          {state.deliverables
            .filter((deliverable) => deliverable.kind !== "print")
            .map((deliverable) => (
              <a
                className={`deliverable deliverable--${deliverable.kind}`}
                href={mediaSource(deliverable.mediaUrl)}
                target="_blank"
                rel="noreferrer"
                key={deliverable.mediaUrl}
              >
                <span>
                  {deliverable.kind === "slideshow"
                    ? "▶"
                    : deliverable.kind === "strip"
                      ? "▥"
                      : "◫"}
                </span>
                <strong>{deliverable.label}</strong>
                <small>Open file</small>
              </a>
            ))}
        </div>
        {isOperator && (
          <button
            className="button button--dark button--large"
            type="button"
            onClick={() => sendCommand({ type: "RESET" })}
          >
            Finish and return to event
          </button>
        )}
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="center-stage">
        <span className="error-icon" aria-hidden="true">
          !
        </span>
        <span className="eyebrow">Operator action needed</span>
        <h1>{state.lastError ?? "Something interrupted the session."}</h1>
        {isOperator && (
          <button
            className="button button--dark"
            type="button"
            onClick={() => sendCommand({ type: "RESET" })}
          >
            Reset booth
          </button>
        )}
      </section>
    );
  }

  return null;
}

function OperatorSidebar({
  state,
  camera,
  customerUrls,
  sendCommand,
}: {
  state: BoothState;
  camera: {
    devices: MediaDeviceInfo[];
    error: string | null;
    selectedDeviceId: string | null;
    startCamera: (deviceId?: string) => Promise<void>;
    status: CameraStatus;
    stopCamera: () => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
  };
  customerUrls: string[];
  sendCommand: (command: Command) => void;
}) {
  const isIdle = state.phase === "idle";
  const macBookSelected = state.cameraSourceId === "macbook_camera";
  const selectedLayout = resolveLayout(state.layoutId, state.customSlots);

  return (
    <aside className="operator-sidebar">
      <section>
        <span className="eyebrow">Pilot hardware</span>
        <h2>Camera source</h2>
        <button
          className={`device-card device-card--selectable ${
            state.cameraSourceId === "simulator" ? "device-card--ready device-card--selected" : ""
          }`}
          type="button"
          disabled={!isIdle}
          onClick={() => sendCommand({ type: "SET_CAMERA_SOURCE", cameraSourceId: "simulator" })}
        >
          <span className="device-card__status" />
          <div>
            <strong>Prototype simulator</strong>
            <small>
              {state.cameraSourceId === "simulator" ? "Ready · active source" : "Available"}
            </small>
          </div>
        </button>
        <button
          className={`device-card device-card--selectable ${
            macBookSelected && camera.status === "ready"
              ? "device-card--ready device-card--selected"
              : macBookSelected
                ? "device-card--selected"
                : ""
          }`}
          type="button"
          disabled={!isIdle}
          onClick={() =>
            sendCommand({ type: "SET_CAMERA_SOURCE", cameraSourceId: "macbook_camera" })
          }
        >
          <span className="device-card__status" />
          <div>
            <strong>MacBook camera</strong>
            <small>
              {!macBookSelected && "Available · experimental"}
              {macBookSelected && camera.status === "off" && "Selected · needs to be enabled"}
              {macBookSelected && camera.status === "requesting" && "Requesting camera access…"}
              {macBookSelected && camera.status === "ready" && "Ready · active source"}
              {macBookSelected && camera.status === "error" && "Needs attention"}
            </small>
          </div>
        </button>

        {macBookSelected && (
          <div className="camera-control">
            <video
              ref={camera.videoRef}
              muted
              playsInline
              aria-label="Live MacBook camera preview"
            />
            {camera.devices.length > 1 && (
              <label>
                Video device
                <select
                  value={camera.selectedDeviceId ?? ""}
                  onChange={(event) => void camera.startCamera(event.target.value)}
                >
                  {camera.devices.map((device, index) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {camera.error && <p className="camera-control__error">{camera.error}</p>}
            {camera.status === "ready" ? (
              <button
                className="button button--quiet button--tiny"
                type="button"
                disabled={!isIdle}
                onClick={camera.stopCamera}
              >
                Turn camera off
              </button>
            ) : (
              <button
                className="button button--primary button--tiny"
                type="button"
                disabled={camera.status === "requesting"}
                onClick={() => void camera.startCamera()}
              >
                {camera.status === "requesting" ? "Starting camera…" : "Enable MacBook camera"}
              </button>
            )}
          </div>
        )}

        <button className="device-card" type="button" disabled>
          <span className="device-card__status" />
          <div>
            <strong>Fujifilm X-M5</strong>
            <small>Planned tether test</small>
          </div>
        </button>
      </section>
      <section className="ipad-connection">
        <span className="eyebrow">iPad customer screen</span>
        <h2>Open in Safari</h2>
        {customerUrls.length > 0 ? (
          <>
            <code>{customerUrls[0]}</code>
            <p>Keep the Mac and iPad on the same Wi-Fi, then enter this address on the iPad.</p>
          </>
        ) : (
          <p>Connect this Mac to Wi-Fi to show the local iPad address.</p>
        )}
      </section>
      <section className="session-facts">
        <span className="eyebrow">Current rules</span>
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>{state.operationMode === "attendant" ? "Attendant" : "Self-service"}</dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>{selectedLayout?.name ?? "Choose in session"}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{selectedLayout?.printSize.replace("x", "×") ?? "—"}</dd>
          </div>
          <div>
            <dt>Photos</dt>
            <dd>
              {state.requiredCaptureCount
                ? `${state.requiredCaptureCount} automatic`
                : "1–8 by layout"}
            </dd>
          </div>
          <div>
            <dt>Retakes</dt>
            <dd>{state.retakesRemaining} left</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>Cash</dd>
          </div>
        </dl>
      </section>
      <p className="privacy-note">
        Local prototype data stays in the ignored <code>data/</code> folder and is never committed
        to GitHub.
      </p>
    </aside>
  );
}

const printStatusLabel = (status: "dialog_opened" | "sent" | "cancelled" | "failed") => {
  if (status === "sent") return "Sent to printer";
  if (status === "cancelled") return "Cancelled";
  if (status === "failed") return "Failed";
  return "Print dialog opened";
};

function PrintSurface({
  state,
  connected,
  sendCommand,
}: {
  state: BoothState;
  connected: boolean;
  sendCommand: (command: Command) => void;
}) {
  const parameters = new URLSearchParams(window.location.search);
  const eventId = parameters.get("eventId") ?? "";
  const sessionId = parameters.get("sessionId") ?? "";
  const event = state.events.find((item) => item.id === eventId);
  const session = event?.sessions.find((item) => item.id === sessionId);
  const printDeliverable = session?.deliverables.find(
    (deliverable) => deliverable.kind === "print",
  );
  const printLayout = getLayout(session?.layoutId ?? null);
  const isLandscape = Boolean(printLayout && printLayout.canvasWidth > printLayout.canvasHeight);
  const [printing, setPrinting] = useState(false);

  const print = async () => {
    if (!event || !session || !printDeliverable || printing) return;
    setPrinting(true);
    const attemptId = createId();
    const requestedAt = new Date().toISOString();
    sendCommand({
      type: "RECORD_PRINT_ATTEMPT",
      eventId: event.id,
      sessionId: session.id,
      attempt: {
        id: attemptId,
        requestedAt,
        completedAt: null,
        status: "dialog_opened",
        failureReason: null,
      },
    });

    if (!window.wanderBooth) {
      window.print();
      setPrinting(false);
      return;
    }

    try {
      const result = await window.wanderBooth.printCurrentWindow();
      const cancelled = !result.success && /cancel/i.test(result.failureReason ?? "");
      sendCommand({
        type: "RECORD_PRINT_ATTEMPT",
        eventId: event.id,
        sessionId: session.id,
        attempt: {
          id: attemptId,
          requestedAt,
          completedAt: new Date().toISOString(),
          status: result.success ? "sent" : cancelled ? "cancelled" : "failed",
          failureReason: result.success ? null : result.failureReason,
        },
      });
    } catch (printError) {
      sendCommand({
        type: "RECORD_PRINT_ATTEMPT",
        eventId: event.id,
        sessionId: session.id,
        attempt: {
          id: attemptId,
          requestedAt,
          completedAt: new Date().toISOString(),
          status: "failed",
          failureReason: printError instanceof Error ? printError.message : "Printing failed.",
        },
      });
    } finally {
      setPrinting(false);
    }
  };

  if (!event || !session || !printDeliverable) {
    return (
      <main className="print-preview print-preview--missing">
        <BrandMark />
        <h1>Print preview is unavailable.</h1>
        <p>Return to the operator window and open this completed session again.</p>
      </main>
    );
  }

  return (
    <main className={`print-preview ${isLandscape ? "print-preview--landscape" : ""}`}>
      <style>{`@media print { @page { size: ${isLandscape ? "6in 4in" : "4in 6in"}; margin: 0; } }`}</style>
      <header className="print-preview__header print-ui">
        <div>
          <span className="eyebrow">4×6 print preview</span>
          <h1>{session.customerName || `Session ${session.number}`}</h1>
          <p>
            {event.name} · {printDeliverable.label}
          </p>
        </div>
        <ConnectionBadge connected={connected} />
      </header>
      <section className="print-preview__workspace">
        <div className="print-preview__sheet">
          <img src={mediaSource(printDeliverable.mediaUrl)} alt="Final 4 by 6 print sheet" />
        </div>
        <aside className="print-preview__controls print-ui">
          <span className="eyebrow">Ready to print</span>
          <h2>Use the system print dialog.</h2>
          <ol>
            <li>Choose the Epson L8050 or another installed printer.</li>
            <li>Select 4×6 paper and the matching portrait or landscape orientation.</li>
            <li>Use 100% / Actual Size and borderless printing when the frame reaches the edge.</li>
          </ol>
          <button
            className="button button--primary button--large"
            type="button"
            disabled={printing || !connected}
            onClick={() => void print()}
          >
            {printing ? "Print dialog open…" : "Open print dialog"}
          </button>
          <p className="print-preview__note">
            WanderBooth records the attempt. Printer, paper, quality, and copy count stay under your
            control in the native dialog.
          </p>
          <div className="print-history">
            <strong>Print history</strong>
            {[...(session.printAttempts ?? [])].reverse().map((attempt) => (
              <div className="print-history__attempt" key={attempt.id}>
                <span>{printStatusLabel(attempt.status)}</span>
                <small>{new Date(attempt.requestedAt).toLocaleString("en-PH")}</small>
              </div>
            ))}
            {(session.printAttempts ?? []).length === 0 && <small>No attempts yet.</small>}
          </div>
        </aside>
      </section>
    </main>
  );
}

const playReadyDing = () => {
  try {
    const audioContext = new AudioContext();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);
    gain.connect(audioContext.destination);
    [880, 1175].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(audioContext.currentTime + index * 0.12);
      oscillator.stop(audioContext.currentTime + 0.3 + index * 0.12);
    });
    window.setTimeout(() => void audioContext.close(), 700);
  } catch {
    // The visual notification remains available if the browser blocks audio.
  }
};

function App() {
  const isOperator = surface === "operator";
  const actor = actorForSurface(surface);
  const { state, connected, customerUrls, error, sendCommand } = useBoothConnection(actor);
  const camera = useMacBookCamera({
    active: isOperator && state?.cameraSourceId === "macbook_camera",
    state,
    sendCommand,
  });
  const interactive = useMemo(
    () => isOperator || state?.operationMode === "self_service",
    [isOperator, state?.operationMode],
  );
  const activeEvent = state ? activeEventFor(state) : null;
  const showOperatorSidebar = isOperator && Boolean(activeEvent);
  const notifiedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (state?.phase) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [state?.phase]);

  useEffect(() => {
    if (
      isOperator &&
      state?.operationMode === "self_service" &&
      state.phase === "complete" &&
      state.sessionId &&
      notifiedSessionRef.current !== state.sessionId
    ) {
      notifiedSessionRef.current = state.sessionId;
      playReadyDing();
    }
  }, [isOperator, state?.operationMode, state?.phase, state?.sessionId]);

  const openCustomerDisplay = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("surface", "customer");
    window.open(url.toString(), "WanderBoothCustomer");
  };

  if (!state) {
    return (
      <main className="loading-screen">
        <BrandMark />
        <div className="processing-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>Starting the booth…</h1>
        <p>{error ?? "Connecting to the local WanderBooth Host."}</p>
      </main>
    );
  }

  if (surface === "print") {
    return <PrintSurface state={state} connected={connected} sendCommand={sendCommand} />;
  }

  return (
    <div className={`app app--${surface}`}>
      <header className="topbar">
        <BrandMark compact />
        <div className="topbar__status">
          <span className="phase-label">
            {state.phase === "idle" && !activeEvent ? "Event library" : phaseLabels[state.phase]}
          </span>
          <ConnectionBadge connected={connected} />
          {isOperator && (
            <button
              className="button button--quiet button--tiny"
              type="button"
              onClick={openCustomerDisplay}
            >
              Open customer screen
            </button>
          )}
          {isOperator &&
            !["idle", "template_gallery", "template_editing", "complete", "error"].includes(
              state.phase,
            ) && (
              <button
                className="button button--danger button--tiny"
                type="button"
                onClick={() => {
                  if (window.confirm("Cancel this session and clear its current selections?")) {
                    sendCommand({ type: "RESET" });
                  }
                }}
              >
                Cancel session
              </button>
            )}
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {isOperator &&
        state.phase === "complete" &&
        state.operationMode === "self_service" &&
        activeEvent &&
        state.sessionId && (
          <div className="print-notification" role="status">
            <span aria-hidden="true">✓</span>
            <div className="print-notification__copy">
              <strong>Self-service session ready to print</strong>
              <small>The guest has finished reviewing and approving the photos.</small>
            </div>
            <button
              className="button button--dark button--tiny"
              type="button"
              onClick={() => openPrintPreview(activeEvent.id, state.sessionId ?? "")}
            >
              Preview &amp; print
            </button>
          </div>
        )}

      <div className={showOperatorSidebar ? "workspace workspace--operator" : "workspace"}>
        <main className="booth-stage">
          {state.phase === "idle" ? (
            isOperator ? (
              activeEvent ? (
                <EventWorkspacePanel
                  state={state}
                  cameraReady={
                    state.cameraSourceId !== "macbook_camera" || camera.status === "ready"
                  }
                  sendCommand={sendCommand}
                />
              ) : (
                <EventLibraryPanel state={state} sendCommand={sendCommand} />
              )
            ) : (
              <section className="customer-hero">
                <div className="customer-hero__splat" aria-hidden="true" />
                <img
                  className="customer-hero__brand"
                  src={wanderPressSplashLogo}
                  alt="Wander Press PH"
                />
                <span className="eyebrow">
                  {activeEvent ? activeEvent.name : "Waiting for an event"}
                </span>
                <h1>{activeEvent ? "Ready to wander?" : "The booth is getting ready."}</h1>
                <p>
                  {activeEvent
                    ? "Your attendant will start the next session."
                    : "The event will appear here when your attendant opens it."}
                </p>
              </section>
            )
          ) : (
            <SessionPanel
              state={state}
              interactive={interactive}
              isOperator={isOperator}
              sendCommand={sendCommand}
            />
          )}
        </main>
        {showOperatorSidebar && (
          <OperatorSidebar
            state={state}
            camera={camera}
            customerUrls={customerUrls}
            sendCommand={sendCommand}
          />
        )}
      </div>
    </div>
  );
}

export default App;
