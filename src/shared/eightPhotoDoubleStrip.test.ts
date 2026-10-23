import { describe, expect, it } from "vitest";
import { type CustomOverlay, getLayout, getProduct, isDoubleStripLayoutId } from "./catalog";
import { initialBoothState, reduceCommand } from "./session";
import { captureFraming } from "./templateFraming";

const layoutId = "double-strip-8-photo-4x6";
const select = (mode: "attendant" | "self_service") => {
  const actor = mode === "attendant" ? "attendant" : "customer";
  let state = reduceCommand(
    { ...initialBoothState(), operationMode: mode },
    { type: "BEGIN_SESSION", sessionId: "eight-photo-test" },
    actor,
  );
  state = reduceCommand(state, { type: "SELECT_PRODUCT", productId: "three-photo-strip" }, actor);
  state = reduceCommand(state, { type: "SELECT_LAYOUT", layoutId }, actor);
  state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "ruby-cream" }, actor);
  state = reduceCommand(state, { type: "RECORD_CONSENT" }, actor);
  return reduceCommand(state, { type: "SUBMIT_SELECTION" }, actor);
};

describe("four-photo double strip", () => {
  it("places eight unique shots in two columns on 4×6, retaining the six-shot option", () => {
    const layout = getLayout(layoutId);
    if (!layout) throw new Error("Missing eight-photo double strip");
    expect(layout).toMatchObject({
      printSize: "4x6",
      canvasWidth: 1200,
      canvasHeight: 1800,
      requiredCaptureCount: 8,
    });
    expect(getProduct("three-photo-strip")?.layoutIds).toContain(layoutId);
    expect(getLayout("double-strip-4x6")?.requiredCaptureCount).toBe(6);
    expect(isDoubleStripLayoutId(layoutId)).toBe(true);
    expect(isDoubleStripLayoutId("double-strip-4x6")).toBe(true);
    expect(isDoubleStripLayoutId("feature-portrait-4x6")).toBe(false);
    expect(layout.slots.map((slot) => slot.captureIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    for (const [index, slot] of layout.slots.entries()) {
      const column = index < 4 ? 0 : 600;
      expect(slot.width / slot.height).toBe(4 / 3);
      expect(slot.x).toBeGreaterThanOrEqual(column);
      expect(slot.x + slot.width).toBeLessThanOrEqual(column + 600);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y + slot.height).toBeLessThan(layout.brandAreas[0].y);
      if (index % 4) {
        const previous = layout.slots[index - 1];
        expect(slot.y).toBeGreaterThan(previous.y + previous.height);
      }
    }
  });

  it.each(["attendant", "self_service"] as const)("selects eight captures in %s mode", (mode) => {
    const state = select(mode);
    expect(state.requiredCaptureCount).toBe(8);
    expect(state.phase).toBe("awaiting_cash");
    expect(captureFraming(state, 8).aspectRatio).toBe(4 / 3);
  });

  it("automatically advances through all eight shots and can retake shot eight", () => {
    let state = reduceCommand(select("attendant"), { type: "CONFIRM_CASH" }, "attendant");
    state = reduceCommand(state, { type: "START_CAPTURE_SEQUENCE" }, "attendant");
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
            mediaUrl: `/media/photo-${slot}-${revision}.png`,
          },
        },
        "system",
      );
    };
    for (let slot = 1; slot <= 8; slot++) {
      expect(state.phase).toBe("countdown");
      complete(slot, 1);
    }
    expect(state.phase).toBe("reviewing");
    expect(state.captures).toHaveLength(8);
    const firstSeven = state.captures.slice(0, 7);
    state = reduceCommand(state, { type: "RETAKE", slot: 8 }, "attendant");
    complete(8, 2);
    expect(state.phase).toBe("reviewing");
    expect(state.captures.slice(0, 7)).toEqual(firstSeven);
    expect(state.captures[7].revision).toBe(2);
  });

  it("saves and reopens an eight-shot imported template with the last holder's orientation", () => {
    const overlay: CustomOverlay = {
      id: "eight-art",
      name: "Synthetic eight-shot frame",
      description: "Test",
      kind: "custom",
      layoutIds: [layoutId],
      mediaUrl: "/media/eight-art.png",
      importMode: "transparent_artwork",
      pixelWidth: 1200,
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
        name: "Eight-shot frame",
        productId: "three-photo-strip",
        layoutId,
        overlayId: overlay.id,
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "SET_HOLDER_ORIENTATION",
        holderId: "capture-8",
        orientation: "portrait",
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "eight-template", name: "Eight-shot frame" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "eight-template" },
      "attendant",
    );
    expect(state.layoutId).toBe(layoutId);
    expect(state.requiredCaptureCount).toBe(8);
    expect(captureFraming(state, 8).aspectRatio).toBe(3 / 4);
    expect(captureFraming(state, 1).aspectRatio).toBe(4 / 3);
  });
});
