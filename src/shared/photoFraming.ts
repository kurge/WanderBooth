export const PHOTO_ASPECT_RATIO = 4 / 3;
export const PHOTO_PREVIEW_WIDTH = 960;
export const PHOTO_PREVIEW_HEIGHT = 720;

/** Largest centered, integer-pixel 4:3 rectangle; never stretches the source. */
export function photoCrop(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 3) {
    throw new Error("The camera image dimensions are invalid.");
  }
  const unit = Math.floor(Math.min(width / 4, height / 3));
  const cropWidth = unit * 4;
  const cropHeight = unit * 3;
  return {
    left: Math.floor((width - cropWidth) / 2),
    top: Math.floor((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}
