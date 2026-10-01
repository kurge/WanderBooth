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

const customPortraitOverlay: CustomOverlay = {
  id: "custom-portrait-overlay",
  name: "Custom Portrait Test",
  description: "Imported custom portrait frame.",
  kind: "custom",
  layoutIds: ["custom-portrait-4x6"],
  mediaUrl: "/media/overlays/custom-portrait-overlay.png",
  sourceMediaUrl: "/media/overlays/custom-portrait-overlay-source.png",
  importMode: "transparent_artwork",
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

const createSavedTemplate = () => {
  let state = reduceCommand(
    initialBoothState(),
    { type: "REGISTER_CUSTOM_OVERLAY", overlay: customOverlay },
    "system",
  );
  state = reduceCommand(state, { type: "OPEN_TEMPLATE_GALLERY" }, "attendant");
  state = reduceCommand(
    state,
    {
      type: "BEGIN_TEMPLATE_CREATE",
      name: "Test Double Strip",
      productId: "three-photo-strip",
      layoutId: "double-strip-4x6",
      overlayId: customOverlay.id,
    },
    "attendant",
  );
  state = reduceCommand(
    state,
    {
      type: "UPDATE_FRAME_TRANSFORM",
      transform: {
        offsetX: 0.04,
        offsetY: -0.03,
        scaleX: 1.05,
        scaleY: 0.95,
        rotation: 2,
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
        offsetX: 0.08,
        offsetY: 0.05,
        scaleX: 1.15,
        scaleY: 0.82,
        rotation: -3,
        locked: true,
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
        offsetX: -0.1,
        offsetY: 0.12,
        scaleX: 1.3,
        scaleY: 1.3,
        rotation: 4,
        locked: false,
      },
    },
    "attendant",
  );
  return reduceCommand(
    state,
    { type: "SAVE_TEMPLATE", templateId: "saved-template-1", name: "Test Double Strip" },
    "attendant",
  );
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

  it("lets staff align numbered placeholders and save them as a reusable template", () => {
    const state = createSavedTemplate();
    expect(state.phase).toBe("template_gallery");
    expect(state.savedTemplates).toHaveLength(1);
    expect(state.savedTemplates[0]).toMatchObject({
      id: "saved-template-1",
      name: "Test Double Strip",
      productId: "three-photo-strip",
      layoutId: "double-strip-4x6",
      overlayId: customOverlay.id,
      approved: true,
      frameTransform: { scaleX: 1.05, scaleY: 0.95, locked: true },
      holderTransforms: [{ slot: 1, scaleX: 1.15, scaleY: 0.82, locked: true }],
      photoTransforms: [{ slot: 1, scaleX: 1.3, scaleY: 1.3 }],
    });
    expect(state.captures).toEqual([]);
  });

  it("maps repeated captures into independently editable custom holders", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customPortraitOverlay },
      "system",
    );
    state = reduceCommand(state, { type: "OPEN_TEMPLATE_GALLERY" }, "attendant");
    state = reduceCommand(
      state,
      {
        type: "BEGIN_TEMPLATE_CREATE",
        name: "Repeated Capture Portrait",
        productId: "custom-photo-layout",
        layoutId: "custom-portrait-4x6",
        overlayId: customPortraitOverlay.id,
        initialHolderId: "holder-a",
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "ADD_TEMPLATE_HOLDER", holderId: "holder-b" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "ADD_TEMPLATE_HOLDER", holderId: "holder-c" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SET_TEMPLATE_HOLDER_CAPTURE", holderId: "holder-b", captureSlot: 1 },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "UPDATE_HOLDER_TRANSFORM",
        slot: 1,
        holderId: "holder-a",
        transform: {
          offsetX: 0.1,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          locked: false,
        },
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "UPDATE_HOLDER_TRANSFORM",
        slot: 1,
        holderId: "holder-b",
        transform: {
          offsetX: -0.2,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 5,
          locked: true,
        },
      },
      "attendant",
    );

    expect(state.customSlots?.map((slot) => slot.captureIndex + 1)).toEqual([1, 1, 2]);
    expect(state.requiredCaptureCount).toBe(2);
    expect(state.holderTransforms).toHaveLength(2);
    expect(state.holderTransforms.map((transform) => transform.holderId)).toEqual([
      "holder-a",
      "holder-b",
    ]);

    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "custom-template-1", name: "Repeated Capture Portrait" },
      "attendant",
    );
    expect(state.savedTemplates[0].customSlots?.map((slot) => slot.captureIndex + 1)).toEqual([
      1, 1, 2,
    ]);
  });

  it("enforces the eight-holder maximum for custom templates", () => {
    let state = reduceCommand(
      initialBoothState(),
      { type: "REGISTER_CUSTOM_OVERLAY", overlay: customPortraitOverlay },
      "system",
    );
    state = reduceCommand(state, { type: "OPEN_TEMPLATE_GALLERY" }, "attendant");
    state = reduceCommand(
      state,
      {
        type: "BEGIN_TEMPLATE_CREATE",
        name: "Eight Holders",
        productId: "custom-photo-layout",
        layoutId: "custom-portrait-4x6",
        overlayId: customPortraitOverlay.id,
        initialHolderId: "holder-1",
      },
      "attendant",
    );
    for (let index = 2; index <= 8; index += 1) {
      state = reduceCommand(
        state,
        { type: "ADD_TEMPLATE_HOLDER", holderId: `holder-${index}` },
        "attendant",
      );
    }
    expect(state.customSlots).toHaveLength(8);
    expect(() =>
      reduceCommand(state, { type: "ADD_TEMPLATE_HOLDER", holderId: "holder-9" }, "attendant"),
    ).toThrow("up to 8 holders");
  });

  it("lets a self-service guest apply a saved template before capture", () => {
    let state = createSavedTemplate();
    state = reduceCommand(state, { type: "CLOSE_TEMPLATE_GALLERY" }, "attendant");
    state = reduceCommand(state, { type: "SET_MODE", mode: "self_service" }, "attendant");
    state = reduceCommand(
      state,
      { type: "BEGIN_SESSION", sessionId: "template-session" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SELECT_TEMPLATE", templateId: "saved-template-1" },
      "customer",
    );

    expect(state.selectedTemplateId).toBe("saved-template-1");
    expect(state.requiredCaptureCount).toBe(6);
    expect(state.overlayId).toBe(customOverlay.id);
    expect(state.frameTransform.locked).toBe(true);
    expect(state.holderTransforms[0]).toMatchObject({ slot: 1, scaleY: 0.82 });
    expect(state.photoTransforms[0]).toMatchObject({ slot: 1, offsetX: -0.1 });
  });

  it("supports both Save changes and Save as new without losing the original", () => {
    let state = createSavedTemplate();
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "saved-template-1" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "saved-template-1", name: "Updated Strip" },
      "attendant",
    );
    expect(state.savedTemplates).toHaveLength(1);
    expect(state.savedTemplates[0].name).toBe("Updated Strip");

    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "saved-template-1" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: "saved-template-2", name: "Copied Strip" },
      "attendant",
    );
    expect(state.savedTemplates.map((template) => template.name)).toEqual([
      "Copied Strip",
      "Updated Strip",
    ]);
    expect(state.savedTemplates.map((template) => template.id)).toContain("saved-template-1");
  });

  it("protects artwork used by a template and leaves it available after template deletion", () => {
    let state = createSavedTemplate();
    expect(() =>
      reduceCommand(
        state,
        { type: "DELETE_CUSTOM_OVERLAY", overlayId: customOverlay.id },
        "system",
      ),
    ).toThrow("Delete templates using this artwork");

    state = reduceCommand(
      state,
      { type: "DELETE_TEMPLATE", templateId: "saved-template-1" },
      "attendant",
    );
    expect(state.savedTemplates).toEqual([]);
    expect(state.customOverlays).toEqual([customOverlay]);

    state = reduceCommand(
      state,
      { type: "DELETE_CUSTOM_OVERLAY", overlayId: customOverlay.id },
      "system",
    );
    expect(state.customOverlays).toEqual([]);
  });

  it("keeps template management staff-only and preserves saved templates on reset", () => {
    expect(() =>
      reduceCommand(initialBoothState(), { type: "OPEN_TEMPLATE_GALLERY" }, "customer"),
    ).toThrow("staff-only");

    const gallery = createSavedTemplate();
    const reset = reduceCommand(gallery, { type: "RESET" }, "attendant");
    expect(reset.phase).toBe("idle");
    expect(reset.savedTemplates).toEqual(gallery.savedTemplates);
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

  it("assigns one master template to multiple reusable folders", () => {
    let state = createSavedTemplate();
    state = reduceCommand(
      state,
      { type: "CREATE_TEMPLATE_FOLDER", folderId: "folder-weddings", name: "Weddings" },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: "saved-template-1" },
      "attendant",
    );
    state = reduceCommand(
      state,
      {
        type: "SAVE_TEMPLATE",
        templateId: "saved-template-1",
        name: "Test Double Strip",
        folderIds: ["folder-general", "folder-weddings"],
      },
      "attendant",
    );

    expect(state.savedTemplates[0]?.folderIds).toEqual(["folder-general", "folder-weddings"]);
  });

  it("keeps one template folder available and rejects duplicate folder identifiers", () => {
    const state = initialBoothState();
    expect(() =>
      reduceCommand(
        state,
        { type: "CREATE_TEMPLATE_FOLDER", folderId: "folder-general", name: "Duplicate" },
        "attendant",
      ),
    ).toThrow("already exists");
    expect(() =>
      reduceCommand(
        state,
        { type: "DELETE_TEMPLATE_FOLDER", folderId: "folder-general" },
        "attendant",
      ),
    ).toThrow("at least one template folder");
  });

  it("copies folder templates into an event and keeps event edits isolated", () => {
    let state = createSavedTemplate();
    state = reduceCommand(state, { type: "CLOSE_TEMPLATE_GALLERY" }, "attendant");
    state = reduceCommand(
      state,
      {
        type: "CREATE_EVENT",
        eventId: "event-lena-miu",
        name: "LenaMiu Event - Nov 22",
        eventDate: "2026-11-22",
        templateFolderId: "folder-general",
      },
      "attendant",
    );

    const eventTemplateId = state.events[0]?.templates[0]?.id ?? "";
    expect(state.events[0]?.templates[0]?.sourceTemplateId).toBe("saved-template-1");
    state = reduceCommand(state, { type: "OPEN_TEMPLATE_GALLERY", scope: "event" }, "attendant");
    state = reduceCommand(
      state,
      { type: "BEGIN_TEMPLATE_EDIT", templateId: eventTemplateId },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "SAVE_TEMPLATE", templateId: eventTemplateId, name: "LenaMiu Event Version" },
      "attendant",
    );

    expect(state.events[0]?.templates[0]?.name).toBe("LenaMiu Event Version");
    expect(state.savedTemplates[0]?.name).toBe("Test Double Strip");
  });

  it("archives a completed session inside its event and preserves it on reset", () => {
    let state = reduceCommand(
      initialBoothState(),
      {
        type: "CREATE_EVENT",
        eventId: "event-session-archive",
        name: "Archive Test",
        eventDate: "2026-11-22",
        templateFolderId: "folder-general",
      },
      "attendant",
    );
    state = {
      ...state,
      phase: "processing",
      sessionId: "session-event-001",
      sessionCustomerName: "Santos family",
      sessionStartedAt: "2026-11-22T10:00:00.000Z",
      productId: "three-photo-strip",
      layoutId: "vertical-2x6",
      captures: [
        {
          slot: 1,
          revision: 1,
          mediaUrl:
            "/media/events/event-session-archive/sessions/session-event-001/captures/photo-1.jpg",
          capturedAt: "2026-11-22T10:01:00.000Z",
        },
      ],
    };
    state = reduceCommand(
      state,
      {
        type: "PROCESSING_COMPLETED",
        deliverables: [
          {
            kind: "slideshow",
            label: "Looping slideshow",
            mediaUrl:
              "/media/events/event-session-archive/sessions/session-event-001/deliverables/slideshow.mp4",
            mimeType: "video/mp4",
          },
        ],
      },
      "system",
    );

    expect(state.events[0]?.sessions[0]).toMatchObject({
      id: "session-event-001",
      number: 1,
      customerName: "Santos family",
      qrStatus: "pending_cloud",
    });
    const reset = reduceCommand(state, { type: "RESET" }, "attendant");
    expect(reset.events[0]?.sessions).toHaveLength(1);
    expect(reset.activeEventId).toBe("event-session-archive");
  });

  it("archives, restores, and reopens a local event", () => {
    let state = reduceCommand(
      initialBoothState(),
      {
        type: "CREATE_EVENT",
        eventId: "event-archive-001",
        name: "Past Event",
        eventDate: "2026-10-01",
        templateFolderId: "folder-general",
      },
      "attendant",
    );
    state = reduceCommand(
      state,
      { type: "ARCHIVE_EVENT", eventId: "event-archive-001" },
      "attendant",
    );
    expect(state.activeEventId).toBeNull();
    expect(state.events[0]?.status).toBe("archived");
    state = reduceCommand(state, { type: "OPEN_EVENT", eventId: "event-archive-001" }, "attendant");
    expect(state.activeEventId).toBe("event-archive-001");
    expect(state.events[0]?.status).toBe("active");
  });
});
