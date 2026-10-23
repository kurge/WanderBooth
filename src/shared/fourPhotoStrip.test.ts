import { describe, expect, it } from "vitest";
import { type CustomOverlay, getLayout, getProduct, selectableLayoutsForProduct } from "./catalog";
import { initialBoothState, reduceCommand } from "./session";
import { captureFraming } from "./templateFraming";

const layoutId = "vertical-four-photo-2x6";

describe("four-photo strip with matching print copies", () => {
  it("offers one four-photo strip in both layout menus and hides the mistaken eight-shot choice", () => {
    const layout = getLayout(layoutId);
    expect(layout).toMatchObject({
      printSize: "2x6",
      canvasWidth: 600,
      canvasHeight: 1800,
      requiredCaptureCount: 4,
    });
    expect(layout?.slots.map((slot) => slot.captureIndex)).toEqual([0, 1, 2, 3]);
    const available = selectableLayoutsForProduct(getProduct("three-photo-strip")).map(
      (item) => item.id,
    );
    expect(available).toContain(layoutId);
    expect(available).toContain("vertical-2x6");
    expect(available).not.toContain("double-strip-8-photo-4x6");
    expect(getLayout("double-strip-8-photo-4x6")?.requiredCaptureCount).toBe(8);
    expect(getLayout("vertical-2x6")?.requiredCaptureCount).toBe(3);
    for (const slot of layout?.slots ?? []) {
      expect(slot.width / slot.height).toBe(4 / 3);
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.width).toBeLessThanOrEqual(600);
      expect(slot.y + slot.height).toBeLessThan(1580);
    }
  });

  it.each(["attendant", "self_service"] as const)(
    "stops after four automatic photos in %s mode",
    (mode) => {
      const actor = mode === "attendant" ? "attendant" : "customer";
      let state = reduceCommand(
        { ...initialBoothState(), operationMode: mode },
        { type: "BEGIN_SESSION", sessionId: "four-photo-test" },
        actor,
      );
      state = reduceCommand(
        state,
        { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
        actor,
      );
      state = reduceCommand(state, { type: "SELECT_LAYOUT", layoutId }, actor);
      expect(state.requiredCaptureCount).toBe(4);
      state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "ruby-cream" }, actor);
      state = reduceCommand(state, { type: "RECORD_CONSENT" }, actor);
      state = reduceCommand(state, { type: "SUBMIT_SELECTION" }, actor);
      state = reduceCommand(state, { type: "CONFIRM_CASH" }, "attendant");
      state = reduceCommand(state, { type: "START_CAPTURE_SEQUENCE" }, actor);
      const complete = (slot: number, revision: number) => {
        state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 2 }, "system");
        state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 1 }, "system");
        state = reduceCommand(state, { type: "COUNTDOWN_TRIGGER" }, "system");
        expect(state.pendingCapture).toMatchObject({ slot, revision });
        state = reduceCommand(
          state,
          {
            type: revision === 1 ? "CAPTURE_COMPLETED" : "RETAKE_COMPLETED",
            capture: {
              slot,
              revision,
              capturedAt: "2026-10-23T00:00:00Z",
              mediaUrl: `/media/${slot}-${revision}.png`,
            },
          },
          "system",
        );
      };
      for (let slot = 1; slot <= 4; slot++) complete(slot, 1);
      expect(state.phase).toBe("reviewing");
      expect(state.captures).toHaveLength(4);
      expect(state.captureSequence).toBeNull();
      state = reduceCommand(state, { type: "RETAKE", slot: 4 }, actor);
      complete(4, 2);
      expect(state.phase).toBe("reviewing");
      expect(state.captures).toHaveLength(4);
      expect(state.captures[3].revision).toBe(2);
    },
  );

  it("saves a single-strip custom template and reopens all four holders", () => {
    const overlay: CustomOverlay = {
      id: "four-art",
      name: "Four-photo test art",
      description: "Synthetic",
      kind: "custom",
      layoutIds: [layoutId],
      mediaUrl: "/media/four-art.png",
      importMode: "transparent_artwork",
      pixelWidth: 600,
      pixelHeight: 1800,
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
        name: "Four-photo strip",
        productId: "three-photo-strip",
        layoutId,
        overlayId: overlay.id,
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SET_HOLDER_ORIENTATION", holderId: "capture-4", orientation: "portrait" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "four-template", name: "Four-photo strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "four-template" },
      "attendant",
    );
    expect(state.layoutId).toBe(layoutId);
    expect(state.requiredCaptureCount).toBe(4);
    expect(captureFraming(state, 4).aspectRatio).toBe(3 / 4);
  });
});
