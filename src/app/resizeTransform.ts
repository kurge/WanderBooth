import type { MediaTransform } from "../shared/catalog";

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type ResizeResult = {
  localCenterShift: { x: number; y: number };
  scaleX: number;
  scaleY: number;
};

const minimumScale = 0.2;
const maximumScale = 4;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function resizeTransform(input: {
  baseHeight: number;
  baseWidth: number;
  handle: ResizeHandle;
  initial: MediaTransform;
  localDelta: { x: number; y: number };
}): ResizeResult {
  const { baseHeight, baseWidth, handle, initial, localDelta } = input;
  const changesX = handle.includes("e") || handle.includes("w");
  const changesY = handle.includes("n") || handle.includes("s");
  const signX = handle.includes("w") ? -1 : 1;
  const signY = handle.includes("n") ? -1 : 1;
  const initialWidth = baseWidth * initial.scaleX;
  const initialHeight = baseHeight * initial.scaleY;
  const isCorner = changesX && changesY;

  let nextScaleX = initial.scaleX;
  let nextScaleY = initial.scaleY;

  if (isCorner) {
    // Project the pointer movement onto the corner diagonal. One multiplier is
    // then applied to both axes, which preserves the object's current ratio.
    const diagonalX = signX * initialWidth;
    const diagonalY = signY * initialHeight;
    const diagonalLengthSquared = diagonalX ** 2 + diagonalY ** 2;
    const requestedMultiplier =
      1 +
      (localDelta.x * diagonalX + localDelta.y * diagonalY) / Math.max(1, diagonalLengthSquared);
    const minimumMultiplier = Math.max(
      minimumScale / initial.scaleX,
      minimumScale / initial.scaleY,
    );
    const maximumMultiplier = Math.min(
      maximumScale / initial.scaleX,
      maximumScale / initial.scaleY,
    );
    const multiplier = clamp(requestedMultiplier, minimumMultiplier, maximumMultiplier);
    nextScaleX = initial.scaleX * multiplier;
    nextScaleY = initial.scaleY * multiplier;
  } else {
    if (changesX) {
      const requestedWidth = initialWidth + signX * localDelta.x;
      nextScaleX = clamp(requestedWidth / baseWidth, minimumScale, maximumScale);
    }
    if (changesY) {
      const requestedHeight = initialHeight + signY * localDelta.y;
      nextScaleY = clamp(requestedHeight / baseHeight, minimumScale, maximumScale);
    }
  }

  const widthChange = baseWidth * (nextScaleX - initial.scaleX);
  const heightChange = baseHeight * (nextScaleY - initial.scaleY);

  return {
    scaleX: nextScaleX,
    scaleY: nextScaleY,
    localCenterShift: {
      x: changesX ? (signX * widthChange) / 2 : 0,
      y: changesY ? (signY * heightChange) / 2 : 0,
    },
  };
}
