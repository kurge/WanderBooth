import { describe, expect, it } from "vitest";
import { type CustomOverlay, getLayout, getProduct } from "./catalog";
import { initialBoothState, reduceCommand } from "./session";
import { captureFraming } from "./templateFraming";

describe("Classic 2×4", () => {
  it("adds a true 300-DPI 2×4 strip without replacing Classic 2×6", () => {
    const layout = getLayout("vertical-2x4");
    expect(layout).toMatchObject({
      name: "Classic 2×4",
      printSize: "2x4",
      canvasWidth: 600,
      canvasHeight: 1200,
      requiredCaptureCount: 3,
    });
    expect(getProduct("three-photo-strip")?.layoutIds).toContain("vertical-2x4");
    expect(getLayout("vertical-2x6")?.canvasHeight).toBe(1800);
    expect(layout?.slots.map((slot) => slot.captureIndex)).toEqual([0, 1, 2]);
    for (const slot of layout?.slots ?? []) {
      expect(slot.width / slot.height).toBeCloseTo(4 / 3);
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.width).toBeLessThanOrEqual(600);
      expect(slot.y + slot.height).toBeLessThan(1050);
    }
  });

  it.each(["attendant", "self_service"] as const)("selects three captures in %s mode", (mode) => {
    const actor = mode === "attendant" ? "attendant" : "customer";
    let state = reduceCommand(
      { ...initialBoothState(), operationMode: mode },
      { type: "BEGIN_SESSION", sessionId: "test-2x4" },
      actor,
    );
    state = reduceCommand(state, { type: "SELECT_PRODUCT", productId: "three-photo-strip" }, actor);
    state = reduceCommand(state, { type: "SELECT_LAYOUT", layoutId: "vertical-2x4" }, actor);
    expect(state.requiredCaptureCount).toBe(3);
    expect(captureFraming(state, 1).aspectRatio).toBe(4 / 3);
    state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "ruby-cream" }, actor);
    state = reduceCommand(state, { type: "RECORD_CONSENT" }, actor);
    state = reduceCommand(state, { type: "SUBMIT_SELECTION" }, actor);
    expect(state.phase).toBe("awaiting_cash");
  });

  it("saves a 2×4 imported-frame template and its portrait holder setting", () => {
    const overlay: CustomOverlay = {
      id: "test-2x4-art",
      name: "Synthetic 2×4 frame",
      description: "Test artwork",
      kind: "custom",
      layoutIds: ["vertical-2x4"],
      mediaUrl: "/media/test-2x4.png",
      importMode: "transparent_artwork",
      pixelWidth: 600,
      pixelHeight: 1200,
    };
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay },
      "system",
    );
    state = reduceCommand(state, { type: "OPEN_TEMPLATE_GALLERY" }, "attendant");
    state = reduceCommand(
      state,
      {
        type: "BEGIN_TEMPLATE_CREATE",
        name: "Short strip",
        productId: "three-photo-strip",
        layoutId: "vertical-2x4",
        overlayId: overlay.id,
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "SET_HOLDER_ORIENTATION",
        holderId: "capture-1",
        orientation: "portrait",
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "test-2x4-template", name: "Short strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "test-2x4-template" },
      "attendant",
    );
    expect(state.layoutId).toBe("vertical-2x4");
    expect(state.requiredCaptureCount).toBe(3);
    expect(captureFraming(state, 1).aspectRatio).toBe(3 / 4);
  });
});
