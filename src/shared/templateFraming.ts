import {
  identityMediaTransform,
  type MediaTransform,
  normalizeMediaTransform,
  type PhotoSlot,
  photoSlotId,
  resolveLayout,
} from "./catalog.js";
import type { BoothState, Capture, HolderTransform } from "./session.js";

export type PhotoOrientation = "landscape" | "portrait" | "custom";
export const isPhotoOrientation = (value: unknown): value is PhotoOrientation =>
  value === "landscape" || value === "portrait" || value === "custom";

export function normalizeHolderTransform(value: HolderTransform): HolderTransform {
  return {
    slot: value.slot,
    ...(value.holderId ? { holderId: value.holderId } : {}),
    ...normalizeMediaTransform(value),
    ...(isPhotoOrientation(value.orientation) ? { orientation: value.orientation } : {}),
  };
}

export function holderTransformFor(
  slot: PhotoSlot,
  transforms: HolderTransform[],
): HolderTransform {
  return (
    transforms.find((item) => item.holderId === photoSlotId(slot)) ??
    transforms.find((item) => !item.holderId && item.slot === slot.captureIndex + 1) ?? {
      slot: slot.captureIndex + 1,
      ...identityMediaTransform(),
    }
  );
}

export const holderAspectRatio = (slot: PhotoSlot, transform: MediaTransform) => {
  const ratio = (slot.width * transform.scaleX) / (slot.height * transform.scaleY);
  if (Math.abs(ratio - 4 / 3) < 1e-8) return 4 / 3;
  if (Math.abs(ratio - 3 / 4) < 1e-8) return 3 / 4;
  return ratio;
};

export function holderOrientation(slot: PhotoSlot, transform: HolderTransform): PhotoOrientation {
  if (transform.orientation) return transform.orientation;
  const ratio = holderAspectRatio(slot, transform);
  if (Math.abs(ratio - 4 / 3) < 0.001) return "landscape";
  if (Math.abs(ratio - 3 / 4) < 0.001) return "portrait";
  return "custom";
}

/** Preserve center and area where possible, then fit within existing transform limits. */
export function orientHolder(
  slot: PhotoSlot,
  transform: HolderTransform,
  orientation: PhotoOrientation,
): HolderTransform {
  if (orientation === "custom") return { ...transform, orientation };
  const ratio = orientation === "portrait" ? 3 / 4 : 4 / 3;
  const area = slot.width * transform.scaleX * slot.height * transform.scaleY;
  let width = Math.sqrt(area * ratio);
  let height = width / ratio;
  const minimum = Math.max((0.2 * slot.width) / width, (0.2 * slot.height) / height);
  const maximum = Math.min((4 * slot.width) / width, (4 * slot.height) / height);
  if (minimum > maximum) throw new Error("This holder is too narrow for that orientation.");
  const fit = Math.max(minimum, Math.min(1, maximum));
  width *= fit;
  height *= fit;
  return { ...transform, orientation, scaleX: width / slot.width, scaleY: height / slot.height };
}

type FramingState = Pick<BoothState, "layoutId" | "customSlots" | "holderTransforms">;
export function captureFraming(state: FramingState, captureSlot: number) {
  const slots =
    resolveLayout(state.layoutId, state.customSlots)?.slots.filter(
      (slot) => slot.captureIndex + 1 === captureSlot,
    ) ?? [];
  const ratios = slots.map((slot) =>
    holderAspectRatio(slot, holderTransformFor(slot, state.holderTransforms)),
  );
  const guides = ratios.filter(
    (ratio, index) => ratios.findIndex((other) => Math.abs(other - ratio) < 0.001) === index,
  );
  if (!guides.length) guides.push(4 / 3);
  return { aspectRatio: guides.length === 1 ? guides[0] : null, guides };
}

export const activeCaptureSlot = (
  state: Pick<BoothState, "pendingCapture" | "captureSequence" | "captures">,
) =>
  state.pendingCapture?.slot ??
  (state.captureSequence?.kind === "retake"
    ? state.captureSequence.slot
    : state.captures.length + 1);

export const sourcePhotoUrl = (capture: Capture) => capture.originalMediaUrl ?? capture.mediaUrl;

export function guideBounds(sourceAspect: number, cropAspect: number) {
  const width = Math.min(1, cropAspect / sourceAspect);
  const height = Math.min(1, sourceAspect / cropAspect);
  return { left: (1 - width) / 2, top: (1 - height) / 2, width, height };
}
