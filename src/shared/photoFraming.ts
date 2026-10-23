export const PHOTO_ASPECT_RATIO = 4 / 3;
export const PHOTO_PREVIEW_WIDTH = 960;
export const PHOTO_PREVIEW_HEIGHT = 720;

/** Largest centered, integer-pixel 4:3 rectangle; never stretches the source. */
export function photoCrop(width: number, height: number, aspectRatio = PHOTO_ASPECT_RATIO) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 3) {
    throw new Error("The camera image dimensions are invalid.");
  }
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error("The photo aspect ratio is invalid.");
  }
  const preset = aspectRatio === 4 / 3 ? [4, 3] : aspectRatio === 3 / 4 ? [3, 4] : null;
  const unit = preset ? Math.floor(Math.min(width / preset[0], height / preset[1])) : 0;
  const cropWidth = preset ? unit * preset[0] : Math.min(width, Math.floor(height * aspectRatio));
  const cropHeight = preset ? unit * preset[1] : Math.min(height, Math.floor(width / aspectRatio));
  if (cropWidth < 1 || cropHeight < 1) throw new Error("The photo crop is too small.");
  return {
    left: Math.floor((width - cropWidth) / 2),
    top: Math.floor((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}
