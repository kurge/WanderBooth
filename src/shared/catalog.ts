export type Product = {
  id: string;
  name: string;
  description: string;
  layoutIds: string[];
  price: null;
};

export type Layout = {
  id: string;
  name: string;
  description: string;
  requiredCaptureCount: number;
  printSize: "2x6";
};

export type Design = {
  id: string;
  name: string;
  description: string;
  accent: string;
  background: string;
};

export const products: Product[] = [
  {
    id: "three-photo-strip",
    name: "Three-photo strip",
    description: "Three portraits arranged vertically on a branded 2×6 strip.",
    layoutIds: ["vertical-2x6"],
    price: null,
  },
];

export const layouts: Layout[] = [
  {
    id: "vertical-2x6",
    name: "Vertical 2×6",
    description: "Three landscape captures stacked in a classic photo strip.",
    requiredCaptureCount: 3,
    printSize: "2x6",
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
];

export const getLayout = (layoutId: string | null) =>
  layouts.find((layout) => layout.id === layoutId) ?? null;

export const getDesign = (designId: string | null) =>
  designs.find((design) => design.id === designId) ?? null;

export const getProduct = (productId: string | null) =>
  products.find((product) => product.id === productId) ?? null;
