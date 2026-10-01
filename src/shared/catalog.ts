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
    description: "Lemon yellow with bold blue, inspired by Wander Press PH.",
    accent: "#2454d8",
    background: "#fff23c",
  },
  {
    id: "blue-hour",
    name: "Blue Hour",
    description: "Deep blue framing with a warm cream finish.",
    accent: "#fff23c",
    background: "#2446a8",
  },
  {
    id: "soft-confetti",
    name: "Soft Confetti",
    description: "Pastel pink, lilac, mint, and sunshine accents.",
    accent: "#2657d9",
    background: "#f7d7e7",
  },
];

export const getLayout = (layoutId: string | null) =>
  layouts.find((layout) => layout.id === layoutId) ?? null;

export const getDesign = (designId: string | null) =>
  designs.find((design) => design.id === designId) ?? null;

export const getProduct = (productId: string | null) =>
  products.find((product) => product.id === productId) ?? null;
