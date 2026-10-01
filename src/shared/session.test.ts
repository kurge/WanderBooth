import { describe, expect, it } from "vitest";

import {
  type CustomOverlay,
  normalizeMediaTransform,
  normalizePhotoTransform,
  products,
} from "./catalog";
import { type BoothState, CommandError, initialBoothState, reduceCommand } from "./session";

const customOverlay: CustomOverlay = {
  id: "custom-test-overlay",
  name: "Test Event",
  description: "Imported test frame.",
  kind: "custom",
  layoutIds: ["double-strip-4x6"],
  mediaUrl: "/media/overlays/custom-test-overlay.png",
  sourceMediaUrl: "/media/overlays/custom-test-overlay-source.png",
  importMode: "flat_template",
  pixelWidth: 1200,
  pixelHeight: 1800,
};

const beginSelection = (mode: "attendant" | "self_service" = "attendant") => {
  const initial = { ...initialBoothState(), operationMode: mode };
  const actor = mode === "attendant" ? "attendant" : "customer";
  return reduceCommand(initial, { type: "BEGIN_SESSION", sessionId: "test-session-001" }, actor);
};

const completeSelection = (mode: "attendant" | "self_service" = "attendant") => {
  const actor = mode === "attendant" ? "attendant" : "customer";
  let state = beginSelection(mode);
  state = reduceCommand(state, { type: "SELECT_PRODUCT", productId: "three-photo-strip" }, actor);
  state = reduceCommand(state, { type: "SELECT_LAYOUT", layoutId: "vertical-2x6" }, actor);
  state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "wander-splash" }, actor);
  state = reduceCommand(state, { type: "RECORD_CONSENT" }, actor);
  return reduceCommand(state, { type: "SUBMIT_SELECTION" }, actor);
};

describe("WanderBooth session rules", () => {
  it("migrates legacy uniform transforms into the direct editor model", () => {
    expect(normalizeMediaTransform({ offsetX: 0.1, offsetY: -0.2, scale: 1.4 })).toEqual({
      offsetX: 0.1,
      offsetY: -0.2,
      scaleX: 1.4,
      scaleY: 1.4,
      rotation: 0,
      locked: false,
    });
  });

  it("normalizes image-crop scaling so photos cannot be stretched", () => {
    expect(
      normalizePhotoTransform({
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.2,
        scaleY: 1.7,
        rotation: 0,
        locked: false,
      }),
    ).toEqual({
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      rotation: 0,
      locked: false,
    });
  });

  it("derives three captures from the selected 2×6 layout", () => {
    const state = completeSelection();
    expect(state.requiredCaptureCount).toBe(3);
    expect(state.phase).toBe("awaiting_cash");
  });

  it("derives six unique captures from the double-strip 4×6 layout", () => {
    let state = beginSelection();
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "double-strip-4x6" },
      "attendant",
    );
    expect(state.requiredCaptureCount).toBe(6);
  });

  it("derives four captures from a selected 4×6 card layout", () => {
    let state = beginSelection();
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "four-photo-card" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "heart-portrait-4x6" },
      "attendant",
    );
    expect(state.requiredCaptureCount).toBe(4);
    expect(state.overlayId).toBe("none");
  });

  it("offers only overlays compatible with the selected layout", () => {
    let state = beginSelection();
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "four-photo-card" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "heart-portrait-4x6" },
      "attendant",
    );
    expect(() =>
      reduceCommand(state, { type: "SELECT_OVERLAY", overlayId: "film-edge" }, "attendant"),
    ).toThrow("not compatible");
    expect(
      reduceCommand(state, { type: "SELECT_OVERLAY", overlayId: "love-hearts" }, "attendant")
        .overlayId,
    ).toBe("love-hearts");
  });

  it("registers an imported overlay and limits it to its chosen layout", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customOverlay },
      "system",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_SESSION", sessionId: "test-session-custom" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "double-strip-4x6" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_OVERLAY", overlayId: customOverlay.id },
      "attendant",
    );
    expect(state.overlayId).toBe(customOverlay.id);
    expect(state.customOverlays).toEqual([customOverlay]);
    expect(state.frameMode).toBe("custom");
    expect(state.designId).toBeNull();
  });

  it("keeps fixed color and imported frames mutually exclusive", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customOverlay },
      "system",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_SESSION", sessionId: "test-frame-modes" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "double-strip-4x6" },
      "attendant",
    );
    state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "blue-hour" }, "attendant");
    expect(state.frameMode).toBe("color");
    state = reduceCommand(
      state,
      { type: "SELECT_OVERLAY", overlayId: customOverlay.id },
      "attendant",
    );
    expect(state.frameMode).toBe("custom");
    expect(state.designId).toBeNull();
    state = reduceCommand(state, { type: "SELECT_DESIGN", designId: "ruby-cream" }, "attendant");
    expect(state.frameMode).toBe("color");
    expect(state.overlayId).toBe("none");
  });

  it("submits an imported frame without requiring a color", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customOverlay },
      "system",
    );
    state = reduceCommand(state, { type: "BEGIN_SESSION", sessionId: "test-custom" }, "attendant");
    state = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_LAYOUT", layoutId: "double-strip-4x6" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_OVERLAY", overlayId: customOverlay.id },
      "attendant",
    );
    state = reduceCommand(state, { type: "RECORD_CONSENT" }, "attendant");
    state = reduceCommand(state, { type: "SUBMIT_SELECTION" }, "attendant");
    expect(state.phase).toBe("awaiting_cash");
    expect(state.designId).toBeNull();
  });

  it("lets staff align a custom frame, photo holders, and photo images during review", () => {
    const capture = {
      capturedAt: "2026-10-02T00:00:00.000Z",
      mediaUrl: "/media/test.jpg",
      revision: 1,
      slot: 1,
    };
    let state: BoothState = {
      ...initialBoothState(),
      phase: "reviewing",
      layoutId: "double-strip-4x6",
      frameMode: "custom",
      overlayId: customOverlay.id,
      customOverlays: [customOverlay],
      captures: [capture],
      requiredCaptureCount: 1,
    };
    state = reduceCommand(
      state,
      {
        type: "UPDATE_FRAME_TRANSFORM",
        transform: {
          offsetX: 0.15,
          offsetY: -0.1,
          scaleX: 1.2,
          scaleY: 0.9,
          rotation: 8,
          locked: true,
        },
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "UPDATE_HOLDER_TRANSFORM",
        slot: 1,
        transform: {
          offsetX: 0.1,
          offsetY: 0.2,
          scaleX: 1.15,
          scaleY: 0.85,
          rotation: -4,
          locked: false,
        },
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "UPDATE_PHOTO_TRANSFORM",
        slot: 1,
        transform: {
          offsetX: -0.2,
          offsetY: 0.25,
          scaleX: 1.35,
          scaleY: 1.35,
          rotation: 12,
          locked: false,
        },
      },
      "attendant",
    );
    expect(state.frameTransform).toEqual({
      offsetX: 0.15,
      offsetY: -0.1,
      scaleX: 1.2,
      scaleY: 0.9,
      rotation: 8,
      locked: true,
    });
    expect(state.holderTransforms).toEqual([
      {
        slot: 1,
        offsetX: 0.1,
        offsetY: 0.2,
        scaleX: 1.15,
        scaleY: 0.85,
        rotation: -4,
        locked: false,
      },
    ]);
    expect(state.photoTransforms).toEqual([
      {
        slot: 1,
        offsetX: -0.2,
        offsetY: 0.25,
        scaleX: 1.35,
        scaleY: 1.35,
        rotation: 12,
        locked: false,
      },
    ]);
    expect(() =>
      reduceCommand(
        state,
        {
          type: "UPDATE_FRAME_TRANSFORM",
          transform: {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            locked: false,
          },
        },
        "customer",
      ),
    ).toThrow("staff-only");
  });

  it("deletes an imported frame and clears it when selected", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customOverlay },
      "system",
    );
    state = { ...state, frameMode: "custom", overlayId: customOverlay.id };
    state = reduceCommand(
      state,
      { type: "DELETE_CUSTOM_OVERLAY", overlayId: customOverlay.id },
      "system",
    );
    expect(state.customOverlays).toEqual([]);
    expect(state.overlayId).toBe("none");
  });

  it("keeps pricing out of the first product catalog", () => {
    expect(products[0].price).toBeNull();
  });

  it("keeps the customer display read-only in attendant mode", () => {
    const state = beginSelection("attendant");
    expect(() =>
      reduceCommand(state, { type: "SELECT_PRODUCT", productId: "three-photo-strip" }, "customer"),
    ).toThrow(CommandError);
  });

  it("lets the customer control the creative flow in self-service mode", () => {
    const state = beginSelection("self_service");
    const selected = reduceCommand(
      state,
      { type: "SELECT_PRODUCT", productId: "three-photo-strip" },
      "customer",
    );
    expect(selected.productId).toBe("three-photo-strip");
  });

  it("allows only staff to confirm cash", () => {
    const state = completeSelection("self_service");
    expect(() => reduceCommand(state, { type: "CONFIRM_CASH" }, "customer")).toThrow("staff-only");
    expect(reduceCommand(state, { type: "CONFIRM_CASH" }, "attendant").phase).toBe("ready");
  });

  it("allows staff to select the MacBook camera only while idle", () => {
    const selected = reduceCommand(
      initialBoothState(),
      { type: "SET_CAMERA_SOURCE", cameraSourceId: "macbook_camera" },
      "attendant",
    );
    expect(selected.cameraSourceId).toBe("macbook_camera");
    expect(() =>
      reduceCommand(
        initialBoothState(),
        { type: "SET_CAMERA_SOURCE", cameraSourceId: "macbook_camera" },
        "customer",
      ),
    ).toThrow("Only staff");
    expect(() =>
      reduceCommand(
        beginSelection(),
        { type: "SET_CAMERA_SOURCE", cameraSourceId: "macbook_camera" },
        "attendant",
      ),
    ).toThrow("not available");
  });

  it("tracks the exact photo expected from a real camera", () => {
    let state = completeSelection();
    state = reduceCommand(state, { type: "CONFIRM_CASH" }, "attendant");
    state = reduceCommand(state, { type: "CAPTURE" }, "attendant");
    expect(state.pendingCapture).toEqual({ kind: "capture", slot: 1, revision: 1 });

    state = reduceCommand(
      state,
      {
        type: "CAPTURE_COMPLETED",
        capture: {
          capturedAt: "2026-10-02T00:00:00.000Z",
          mediaUrl: "/media/test.jpg",
          revision: 1,
          slot: 1,
        },
      },
      "system",
    );
    expect(state.pendingCapture).toBeNull();
    expect(state.phase).toBe("ready");
  });

  it("runs an authoritative three-second automatic capture sequence", () => {
    let state = completeSelection();
    state = reduceCommand(state, { type: "CONFIRM_CASH" }, "attendant");
    state = reduceCommand(state, { type: "START_CAPTURE_SEQUENCE" }, "attendant");
    expect(state.phase).toBe("countdown");
    expect(state.captureSequence).toEqual({ kind: "initial", remaining: 3 });

    state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 2 }, "system");
    state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 1 }, "system");
    state = reduceCommand(state, { type: "COUNTDOWN_TRIGGER" }, "system");
    expect(state.pendingCapture).toEqual({ kind: "capture", slot: 1, revision: 1 });

    state = reduceCommand(
      state,
      {
        type: "CAPTURE_COMPLETED",
        capture: {
          capturedAt: "2026-10-02T00:00:00.000Z",
          mediaUrl: "/media/sequence-1.jpg",
          revision: 1,
          slot: 1,
        },
      },
      "system",
    );
    expect(state.phase).toBe("countdown");
    expect(state.captureSequence).toEqual({ kind: "initial", remaining: 3 });
  });

  it("counts down before replacing a selected photo", () => {
    const existing = {
      capturedAt: "2026-10-02T00:00:00.000Z",
      mediaUrl: "/media/original.jpg",
      revision: 1,
      slot: 2,
    };
    let state: BoothState = {
      ...initialBoothState(),
      phase: "reviewing" as const,
      requiredCaptureCount: 3,
      captures: [{ ...existing, slot: 1 }, existing, { ...existing, slot: 3 }],
    };

    state = reduceCommand(state, { type: "RETAKE", slot: 2 }, "attendant");
    expect(state.phase).toBe("countdown");
    expect(state.captureSequence).toEqual({ kind: "retake", remaining: 3, slot: 2 });
    state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 2 }, "system");
    state = reduceCommand(state, { type: "COUNTDOWN_TICK", remaining: 1 }, "system");
    state = reduceCommand(state, { type: "COUNTDOWN_TRIGGER" }, "system");
    expect(state.pendingCapture).toEqual({ kind: "retake", slot: 2, revision: 2 });
  });

  it("rejects unknown designs", () => {
    const state = beginSelection();
    expect(() =>
      reduceCommand(state, { type: "SELECT_DESIGN", designId: "not-real" }, "attendant"),
    ).toThrow("not available");
  });

  it("cancels an active countdown and preserves staff setup when reset", () => {
    const state: BoothState = {
      ...initialBoothState(),
      operationMode: "self_service",
      cameraSourceId: "macbook_camera",
      phase: "countdown",
      sessionId: "test-session-001",
      captureSequence: { kind: "initial", remaining: 2 },
      revision: 9,
    };
    const reset = reduceCommand(state, { type: "RESET" }, "owner");
    expect(reset.operationMode).toBe("self_service");
    expect(reset.cameraSourceId).toBe("macbook_camera");
    expect(reset.revision).toBe(10);
    expect(reset.phase).toBe("idle");
    expect(reset.sessionId).toBeNull();
    expect(reset.captureSequence).toBeNull();
    expect(reset.pendingCapture).toBeNull();
  });
});
