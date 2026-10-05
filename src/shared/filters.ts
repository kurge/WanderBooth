export const photoFilters = [
  {
    id: "original",
    name: "Original",
    description: "The photo exactly as captured.",
    cssFilter: "none",
  },
  {
    id: "black_and_white",
    name: "B&W",
    description: "Clean monochrome with a little extra contrast.",
    cssFilter: "grayscale(1) contrast(1.08)",
  },
  {
    id: "warm",
    name: "Warm",
    description: "Warmer skin tones and gently richer color.",
    cssFilter: "sepia(0.16) saturate(1.13) contrast(1.02)",
  },
  {
    id: "cool",
    name: "Cool",
    description: "A crisp, slightly cooler color balance.",
    cssFilter: "saturate(0.92) contrast(1.04) hue-rotate(5deg)",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Soft contrast with a classic sepia cast.",
    cssFilter: "sepia(0.42) saturate(0.78) contrast(0.94) brightness(1.04)",
  },
  {
    id: "high_contrast",
    name: "High Contrast",
    description: "Deeper shadows and brighter highlights.",
    cssFilter: "contrast(1.34) saturate(1.06)",
  },
] as const;

export type PhotoFilterId = (typeof photoFilters)[number]["id"];

export const isPhotoFilterId = (value: unknown): value is PhotoFilterId =>
  photoFilters.some((filter) => filter.id === value);

export const photoFilterCss = (filterId: PhotoFilterId | undefined) =>
  photoFilters.find((filter) => filter.id === filterId)?.cssFilter ?? "none";
