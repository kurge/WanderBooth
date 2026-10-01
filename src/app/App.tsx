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
  type Layout,
  layouts,
  type MediaTransform,
  type Overlay,
  overlaySupportsLayout,
  overlays,
  products,
} from "../shared/catalog";
import type {
  Actor,
  BoothState,
  Command,
  HolderTransform,
  OperationMode,
  PhotoTransform,
} from "../shared/session";
import { createId } from "./createId";
import { type ResizeHandle, resizeTransform } from "./resizeTransform";
import { hostHttpUrl, useBoothConnection } from "./useBoothConnection";
import { type CameraStatus, useMacBookCamera } from "./useMacBookCamera";

type Surface = "operator" | "customer";

const surface = (new URLSearchParams(window.location.search).get("surface") ??
  "operator") as Surface;

const phaseLabels: Record<BoothState["phase"], string> = {
  idle: "Ready for a new guest",
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
  selectedSurface === "operator" ? "attendant" : "customer";

const mediaSource = (url: string) => `${hostHttpUrl}${url}`;

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
              <img src={mediaSource(capture.mediaUrl)} alt={`Capture ${slot}`} />
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

const slotTransformMap = (transforms: Array<HolderTransform | PhotoTransform>) =>
  Object.fromEntries(transforms.map(({ slot, ...transform }) => [slot, transform])) as Record<
    number,
    MediaTransform
  >;

type CompositionTarget = "frame" | `holder:${number}` | `image:${number}`;
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
  if (target === "frame") return { kind: "frame" as const, slot: null };
  const [kind, slot] = target.split(":");
  return { kind: kind as "holder" | "image", slot: Number(slot) };
};

const compositionTargetLabel = (target: CompositionTarget) => {
  const description = describeCompositionTarget(target);
  if (description.kind === "frame") return "frame artwork";
  return description.kind === "holder"
    ? `photo ${description.slot} frame`
    : `photo ${description.slot} image`;
};

function LayoutPreview({
  state,
  editable,
  sendCommand,
}: {
  state: BoothState;
  editable: boolean;
  sendCommand: (command: Command) => void;
}) {
  const layout = getLayout(state.layoutId);
  const design = getDesign(state.designId) ?? getDesign("wander-splash");
  const overlay = getOverlay(state.overlayId, state.customOverlays);
  const customOverlay = overlay?.kind === "custom" ? overlay : null;
  const [activeTarget, setActiveTarget] = useState<CompositionTarget>("frame");
  const [frameDraft, setFrameDraft] = useState(state.frameTransform);
  const [holderDrafts, setHolderDrafts] = useState<Record<number, MediaTransform>>(
    slotTransformMap(state.holderTransforms),
  );
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, MediaTransform>>(
    slotTransformMap(state.photoTransforms),
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
    () => setHolderDrafts(slotTransformMap(state.holderTransforms)),
    [state.holderTransforms],
  );
  useEffect(() => setPhotoDrafts(slotTransformMap(state.photoTransforms)), [state.photoTransforms]);

  if (!layout || !design || !overlay) return null;

  const transformFor = (target: CompositionTarget) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") return frameDraft;
    if (description.kind === "holder") {
      return holderDrafts[description.slot] ?? identityMediaTransform();
    }
    return photoDrafts[description.slot] ?? identityMediaTransform();
  };
  const updateDraft = (target: CompositionTarget, transform: MediaTransform) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") setFrameDraft(transform);
    else if (description.kind === "holder") {
      setHolderDrafts((current) => ({ ...current, [description.slot]: transform }));
    } else {
      setPhotoDrafts((current) => ({ ...current, [description.slot]: transform }));
    }
  };
  const commitTransform = (target: CompositionTarget, transform: MediaTransform) => {
    const description = describeCompositionTarget(target);
    if (description.kind === "frame") {
      sendCommand({ type: "UPDATE_FRAME_TRANSFORM", transform });
    } else if (description.kind === "holder") {
      sendCommand({ type: "UPDATE_HOLDER_TRANSFORM", slot: description.slot, transform });
    } else {
      sendCommand({ type: "UPDATE_PHOTO_TRANSFORM", slot: description.slot, transform });
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
    const slot = layout.slots.find((item) => item.captureIndex + 1 === description.slot);
    if (!slot) return null;
    const holderTransform = holderDrafts[description.slot] ?? identityMediaTransform();
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
    const photoTransform = photoDrafts[description.slot] ?? identityMediaTransform();
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
    const slotElement = targetElement.closest<HTMLElement>("[data-capture-slot]");
    if (slotElement) {
      const slot = Number(slotElement.dataset.captureSlot);
      const imageTarget: CompositionTarget = `image:${slot}`;
      const target: CompositionTarget =
        activeTarget === imageTarget ? imageTarget : `holder:${slot}`;
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
    const slotElement = (event.target as HTMLElement).closest<HTMLElement>("[data-capture-slot]");
    if (!slotElement) return;
    event.preventDefault();
    setActiveTarget(`image:${Number(slotElement.dataset.captureSlot)}`);
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
    if (description.slot !== null) setActiveTarget(`${kind}:${description.slot}`);
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
    <section className="layout-preview-card" aria-label="Final layout preview">
      <div className="layout-preview-card__heading">
        <div>
          <span>Final layout preview</span>
          <strong>{layout.name}</strong>
        </div>
        <small>{layout.printSize.replace("x", "×")} output</small>
      </div>
      <div
        role="application"
        aria-label={editable ? "Direct layout editor" : "Final layout"}
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
          const capture = state.captures.find((item) => item.slot === captureSlot);
          const holderTransform = holderDrafts[captureSlot] ?? identityMediaTransform();
          const photoTransform = photoDrafts[captureSlot] ?? identityMediaTransform();
          const holderIsActive = activeTarget === `holder:${captureSlot}` && editable;
          const imageIsActive = activeTarget === `image:${captureSlot}` && editable;
          return (
            <div
              className={`layout-composer__slot layout-composer__slot--${slot.shape} ${
                holderIsActive ? "layout-composer__slot--active-holder" : ""
              } ${imageIsActive ? "layout-composer__slot--active-image" : ""}`}
              data-capture-slot={captureSlot}
              key={`${captureSlot}-${slot.x}-${slot.y}`}
              style={{
                ...holderStyle(slot, layout, holderTransform),
              }}
            >
              {capture ? (
                <img
                  src={mediaSource(capture.mediaUrl)}
                  style={transformStyle(photoTransform)}
                  alt=""
                />
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
              (slot) => slot.captureIndex + 1 === describeCompositionTarget(activeTarget).slot,
            )
            .map((slot) => {
              const captureSlot = slot.captureIndex + 1;
              const holderTransform = holderDrafts[captureSlot] ?? identityMediaTransform();
              const photoTransform = photoDrafts[captureSlot] ?? identityMediaTransform();
              const mode = describeCompositionTarget(activeTarget).kind;
              const slotPosition = {
                ...holderStyle(slot, layout, holderTransform),
              };
              return mode === "holder" ? (
                <div
                  className="layout-composer__selection layout-composer__selection--holder"
                  key={`selection-${captureSlot}-${slot.x}-${slot.y}`}
                  style={{
                    ...slotPosition,
                  }}
                  aria-hidden="true"
                >
                  <b>Photo {captureSlot} frame</b>
                  {selectionControls(activeTarget, holderTransform)}
                </div>
              ) : (
                <div
                  className="layout-composer__selection-wrapper"
                  key={`selection-${captureSlot}-${slot.x}-${slot.y}`}
                  style={{
                    ...slotPosition,
                  }}
                  aria-hidden="true"
                >
                  <div
                    className="layout-composer__selection layout-composer__selection--image layout-composer__selection--nested"
                    style={transformStyle(photoTransform)}
                  >
                    <b>Crop photo {captureSlot}</b>
                    {selectionControls(activeTarget, photoTransform)}
                  </div>
                </div>
              );
            })}
        {editable && (
          <span className="layout-composer__drag-hint">
            {describeCompositionTarget(activeTarget).kind === "image"
              ? `Crop mode · drag, resize, or rotate${activeTransform.locked ? " · locked" : ""}`
              : `${activeTransform.locked ? "Locked" : "Drag, resize, or rotate"} ${compositionTargetLabel(activeTarget)}`}
          </span>
        )}
      </div>
      {editable && customOverlay && (
        <div className="composition-editor">
          <div className="composition-editor__selection-bar">
            <span>Selected</span>
            <strong>{compositionTargetLabel(activeTarget)}</strong>
            <button
              type="button"
              aria-pressed={activeTarget === "frame"}
              onClick={() => setActiveTarget("frame")}
            >
              Artwork
            </button>
            {describeCompositionTarget(activeTarget).slot && (
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
          </p>
        </div>
      )}
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
  const selectedLayout = getLayout(state.layoutId);
  const availableLayouts = selectedProduct
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
        <h1>Choose a product, layout, and frame.</h1>
        <p>
          Every layout sets its own photo count automatically. Pricing remains on the physical menu
          for now.
        </p>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">01</span>
          <div>
            <small>Product</small>
            <h2>Choose the photo experience</h2>
          </div>
        </div>
        <div className="product-grid">
          {products.map((product) => (
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

        {state.frameMode === "color" && (
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

        {state.frameMode === "custom" && selectedLayout && (
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
        <div className="deliverable-grid">
          {state.deliverables.map((deliverable) => (
            <a
              className={`deliverable deliverable--${deliverable.kind}`}
              href={mediaSource(deliverable.mediaUrl)}
              target="_blank"
              rel="noreferrer"
              key={deliverable.mediaUrl}
            >
              <span>
                {deliverable.kind === "slideshow" ? "▶" : deliverable.kind === "strip" ? "▥" : "◫"}
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
            Finish and reset booth
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
  const selectedLayout = getLayout(state.layoutId);

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
                : "3, 4, or 6"}
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

  useEffect(() => {
    if (state?.phase) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [state?.phase]);

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

  return (
    <div className={`app app--${surface}`}>
      <header className="topbar">
        <BrandMark compact />
        <div className="topbar__status">
          <span className="phase-label">{phaseLabels[state.phase]}</span>
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
          {isOperator && !["idle", "complete", "error"].includes(state.phase) && (
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

      <div className={isOperator ? "workspace workspace--operator" : "workspace"}>
        <main className="booth-stage">
          {state.phase === "idle" ? (
            isOperator ? (
              <section className="welcome-panel">
                <div className="welcome-panel__copy">
                  <span className="eyebrow">Phase 0 · working prototype</span>
                  <h1>Set the mode, then welcome your next guest.</h1>
                  <p>
                    The same session will stay synchronized between this Mac and the iPad customer
                    screen.
                  </p>
                </div>
                <ModeSelector value={state.operationMode} sendCommand={sendCommand} />
                <button
                  className="button button--primary button--large"
                  type="button"
                  disabled={state.cameraSourceId === "macbook_camera" && camera.status !== "ready"}
                  onClick={() => sendCommand({ type: "BEGIN_SESSION", sessionId: createId() })}
                >
                  Start a new session
                </button>
                {state.cameraSourceId === "macbook_camera" && camera.status !== "ready" && (
                  <p className="start-note">Enable the MacBook camera before starting a session.</p>
                )}
              </section>
            ) : (
              <section className="customer-hero">
                <div className="customer-hero__splat" aria-hidden="true" />
                <img
                  className="customer-hero__brand"
                  src={wanderPressSplashLogo}
                  alt="Wander Press PH"
                />
                <span className="eyebrow">Your photos. One keepsake.</span>
                <h1>Ready to wander?</h1>
                <p>Your attendant will start the next session.</p>
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
        {isOperator && (
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
