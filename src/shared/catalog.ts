export type Product = {
  id: string;
  name: string;
  description: string;
  layoutIds: string[];
  price: null;
};

export type SlotShape = "rectangle" | "rounded" | "heart";

export type PhotoSlot = {
  captureIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: SlotShape;
};

export type BrandArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  align: "left" | "center";
};

export type Layout = {
  id: string;
  name: string;
  description: string;
  requiredCaptureCount: number;
  printSize: "2x6" | "4x6";
  canvasWidth: number;
  canvasHeight: number;
  slots: PhotoSlot[];
  brandAreas: BrandArea[];
};

export type Design = {
  id: string;
  name: string;
  description: string;
  accent: string;
  background: string;
};

export type OverlayKind = "none" | "film" | "confetti" | "hearts" | "custom";

export type CustomOverlayMode = "transparent_artwork" | "flat_template";

export type MediaTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export const identityMediaTransform = (): MediaTransform => ({
  offsetX: 0,
  offsetY: 0,
  scale: 1,
});

type OverlayBase = {
  id: string;
  name: string;
  description: string;
  layoutIds: string[] | "all";
};

export type CustomOverlay = OverlayBase & {
  kind: "custom";
  layoutIds: [string];
  mediaUrl: string;
  sourceMediaUrl?: string;
  importMode: CustomOverlayMode;
  pixelWidth: number;
  pixelHeight: number;
};

export type Overlay = (OverlayBase & { kind: Exclude<OverlayKind, "custom"> }) | CustomOverlay;

export const products: Product[] = [
  {
    id: "three-photo-strip",
    name: "Three-photo strip",
    description: "Three portraits as one strip or two matching strips on a 4×6 sheet.",
    layoutIds: ["vertical-2x6", "double-strip-4x6"],
    price: null,
  },
  {
    id: "four-photo-card",
    name: "Four-photo card",
    description: "A 4×6 keepsake with four photos in a portrait or landscape composition.",
    layoutIds: ["feature-portrait-4x6", "heart-portrait-4x6", "party-landscape-4x6"],
    price: null,
  },
];

export const layouts: Layout[] = [
  {
    id: "vertical-2x6",
    name: "Classic 2×6",
    description: "Three landscape captures stacked in a classic vertical photo strip.",
    requiredCaptureCount: 3,
    printSize: "2x6",
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { captureIndex: 0, x: 30, y: 115, width: 540, height: 420, shape: "rounded" },
      { captureIndex: 1, x: 30, y: 565, width: 540, height: 420, shape: "rounded" },
      { captureIndex: 2, x: 30, y: 1015, width: 540, height: 420, shape: "rounded" },
    ],
    brandAreas: [{ x: 30, y: 1480, width: 540, height: 260, align: "center" }],
  },
  {
    id: "double-strip-4x6",
    name: "Double strip 4×6",
    description: "Two matching three-photo strips on one 4×6 sheet, ready to cut.",
    requiredCaptureCount: 3,
    printSize: "4x6",
    canvasWidth: 1200,
    canvasHeight: 1800,
    slots: [
      { captureIndex: 0, x: 45, y: 115, width: 510, height: 390, shape: "rounded" },
      { captureIndex: 1, x: 45, y: 535, width: 510, height: 390, shape: "rounded" },
      { captureIndex: 2, x: 45, y: 955, width: 510, height: 390, shape: "rounded" },
      { captureIndex: 0, x: 645, y: 115, width: 510, height: 390, shape: "rounded" },
      { captureIndex: 1, x: 645, y: 535, width: 510, height: 390, shape: "rounded" },
      { captureIndex: 2, x: 645, y: 955, width: 510, height: 390, shape: "rounded" },
    ],
    brandAreas: [
      { x: 45, y: 1400, width: 510, height: 310, align: "center" },
      { x: 645, y: 1400, width: 510, height: 310, align: "center" },
    ],
  },
  {
    id: "feature-portrait-4x6",
    name: "Feature portrait",
    description: "Three smaller moments beside one large feature photo.",
    requiredCaptureCount: 4,
    printSize: "4x6",
    canvasWidth: 1200,
    canvasHeight: 1800,
    slots: [
      { captureIndex: 0, x: 65, y: 95, width: 445, height: 360, shape: "rounded" },
      { captureIndex: 1, x: 65, y: 490, width: 445, height: 360, shape: "rounded" },
      { captureIndex: 2, x: 65, y: 885, width: 445, height: 360, shape: "rounded" },
      { captureIndex: 3, x: 550, y: 95, width: 585, height: 1150, shape: "rounded" },
    ],
    brandAreas: [{ x: 70, y: 1330, width: 1060, height: 380, align: "center" }],
  },
  {
    id: "heart-portrait-4x6",
    name: "Heart feature",
    description: "Three classic frames with a large heart-shaped fourth photo.",
    requiredCaptureCount: 4,
    printSize: "4x6",
    canvasWidth: 1200,
    canvasHeight: 1800,
    slots: [
      { captureIndex: 0, x: 70, y: 90, width: 455, height: 390, shape: "rectangle" },
      { captureIndex: 1, x: 70, y: 515, width: 455, height: 390, shape: "rectangle" },
      { captureIndex: 2, x: 70, y: 940, width: 455, height: 390, shape: "rectangle" },
      { captureIndex: 3, x: 565, y: 90, width: 600, height: 900, shape: "heart" },
    ],
    brandAreas: [{ x: 565, y: 1080, width: 575, height: 560, align: "center" }],
  },
  {
    id: "party-landscape-4x6",
    name: "Party landscape",
    description: "Three photos across the top and one large celebration photo below.",
    requiredCaptureCount: 4,
    printSize: "4x6",
    canvasWidth: 1800,
    canvasHeight: 1200,
    slots: [
      { captureIndex: 0, x: 105, y: 110, width: 500, height: 365, shape: "rounded" },
      { captureIndex: 1, x: 650, y: 110, width: 500, height: 365, shape: "rounded" },
      { captureIndex: 2, x: 1195, y: 110, width: 500, height: 365, shape: "rounded" },
      { captureIndex: 3, x: 105, y: 525, width: 800, height: 560, shape: "rounded" },
    ],
    brandAreas: [{ x: 990, y: 565, width: 705, height: 470, align: "center" }],
  },
];

export const designs: Design[] = [
  {
    id: "wander-splash",
    name: "Wander Splash",
    description: "The Wander Press blue-and-lime splash palette.",
    accent: "#3572c4",
    background: "#ddf426",
  },
  {
    id: "blue-hour",
    name: "Blue Pop",
    description: "Wander blue with a bright yellow finish.",
    accent: "#fffc02",
    background: "#3572c4",
  },
  {
    id: "soft-confetti",
    name: "Press Orange",
    description: "Warm orange lettering on the signature cream.",
    accent: "#da6319",
    background: "#fffaf2",
  },
  {
    id: "midnight-film",
    name: "Midnight Film",
    description: "Cream details on a deep shadow-purple frame.",
    accent: "#fffaf2",
    background: "#290942",
  },
  {
    id: "ruby-cream",
    name: "Ruby Cream",
    description: "A warm red frame with soft cream details.",
    accent: "#fffaf2",
    background: "#a81724",
  },
];

export const overlays: Overlay[] = [
  {
    id: "none",
    name: "No overlay",
    description: "Keep the frame clean and let the photos lead.",
    kind: "none",
    layoutIds: "all",
  },
  {
    id: "film-edge",
    name: "Film edge",
    description: "Perforated film details inspired by the supplied strip references.",
    kind: "film",
    layoutIds: ["vertical-2x6", "double-strip-4x6", "feature-portrait-4x6"],
  },
  {
    id: "party-confetti",
    name: "Party confetti",
    description: "Celebration shapes around the outside of the frame.",
    kind: "confetti",
    layoutIds: ["double-strip-4x6", "feature-portrait-4x6", "party-landscape-4x6"],
  },
  {
    id: "love-hearts",
    name: "Love hearts",
    description: "Layered heart outlines for weddings, couples, and celebrations.",
    kind: "hearts",
    layoutIds: ["heart-portrait-4x6", "feature-portrait-4x6"],
  },
];

export const getLayout = (layoutId: string | null) =>
  layouts.find((layout) => layout.id === layoutId) ?? null;

export const getDesign = (designId: string | null) =>
  designs.find((design) => design.id === designId) ?? null;

export const getOverlay = (overlayId: string | null, customOverlays: CustomOverlay[] = []) =>
  overlays.find((overlay) => overlay.id === overlayId) ??
  customOverlays.find((overlay) => overlay.id === overlayId) ??
  null;

export const getProduct = (productId: string | null) =>
  products.find((product) => product.id === productId) ?? null;

export const overlaySupportsLayout = (overlay: Overlay, layoutId: string) =>
  overlay.layoutIds === "all" || overlay.layoutIds.includes(layoutId);
