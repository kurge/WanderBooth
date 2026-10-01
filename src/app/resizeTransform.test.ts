import { describe, expect, it } from "vitest";

import { identityMediaTransform } from "../shared/catalog";
import { resizeTransform } from "./resizeTransform";

describe("direct canvas resizing", () => {
  it("keeps the current ratio when a corner is dragged", () => {
    const result = resizeTransform({
      baseWidth: 100,
      baseHeight: 100,
      handle: "se",
      initial: identityMediaTransform(),
      localDelta: { x: 50, y: 50 },
    });

    expect(result.scaleX).toBeCloseTo(1.5);
    expect(result.scaleY).toBeCloseTo(1.5);
    expect(result.localCenterShift).toEqual({ x: 25, y: 25 });
  });

  it("preserves an already reshaped holder ratio from a corner", () => {
    const initial = { ...identityMediaTransform(), scaleX: 1.5, scaleY: 0.75 };
    const result = resizeTransform({
      baseWidth: 100,
      baseHeight: 200,
      handle: "nw",
      initial,
      localDelta: { x: -30, y: -30 },
    });

    expect(result.scaleX / result.scaleY).toBeCloseTo(initial.scaleX / initial.scaleY);
    expect(result.scaleX).toBeGreaterThan(initial.scaleX);
    expect(result.scaleY).toBeGreaterThan(initial.scaleY);
    expect(result.localCenterShift.x).toBeLessThan(0);
    expect(result.localCenterShift.y).toBeLessThan(0);
  });

  it("moves only one edge when a middle handle is dragged", () => {
    const result = resizeTransform({
      baseWidth: 100,
      baseHeight: 200,
      handle: "e",
      initial: identityMediaTransform(),
      localDelta: { x: 50, y: 80 },
    });

    expect(result.scaleX).toBeCloseTo(1.5);
    expect(result.scaleY).toBe(1);
    expect(result.localCenterShift).toEqual({ x: 25, y: 0 });
  });
});
