import { describe, expect, it } from "vitest";
import { identityMediaTransform, type PhotoSlot } from "./catalog";
import { type BoothState, type Command, initialBoothState, reduceCommand } from "./session";
import {
  activeCaptureSlot,
  captureFraming,
  guideBounds,
  holderAspectRatio,
  holderOrientation,
  holderTransformFor,
  normalizeHolderTransform,
  orientHolder,
  sourcePhotoUrl,
} from "./templateFraming";

const slot: PhotoSlot = {
  id: "holder-a",
  captureIndex: 0,
  x: 20,
  y: 50,
  width: 400,
  height: 300,
  shape: "rectangle",
};
const editor = () => ({
  ...initialBoothState(),
  phase: "template_editing" as const,
  frameMode: "custom" as const,
  layoutId: "custom-portrait-4x6",
  productId: "custom-photo-layout",
  overlayId: "test-overlay",
  templateEditor: {
    sourceTemplateId: null,
    startingName: "Mixed",
    startingFolderIds: ["folder-general"],
  },
  customSlots: [slot, { ...slot, id: "holder-b", y: 600, captureIndex: 1 }],
  requiredCaptureCount: 2,
  customOverlays: [
    {
      id: "test-overlay",
      name: "Test",
      description: "Synthetic",
      kind: "custom" as const,
      layoutIds: ["custom-portrait-4x6"] as [string],
      mediaUrl: "/media/test.png",
      importMode: "transparent_artwork" as const,
      pixelWidth: 1200,
      pixelHeight: 1800,
    },
  ],
});
const run = (state: BoothState, command: Command) => reduceCommand(state, command, "attendant");

describe("template photo orientation", () => {
  it("changes holder proportions while retaining position, rotation, and area", () => {
    const previous = {
      slot: 1,
      ...identityMediaTransform(),
      offsetX: 0.2,
      offsetY: -0.1,
      rotation: 12,
    };
    const portrait = orientHolder(slot, previous, "portrait");
    expect(holderAspectRatio(slot, portrait)).toBeCloseTo(0.75);
    expect(portrait.scaleX * portrait.scaleY).toBeCloseTo(1);
    expect(portrait).toMatchObject({
      offsetX: 0.2,
      offsetY: -0.1,
      rotation: 12,
      orientation: "portrait",
    });
    expect(holderAspectRatio(slot, orientHolder(slot, portrait, "landscape"))).toBeCloseTo(4 / 3);
    expect(orientHolder(slot, portrait, "custom")).toEqual({ ...portrait, orientation: "custom" });
  });
  it("sets each holder independently and saves/reopens the setting", () => {
    let state = run(editor(), {
      type: "SET_HOLDER_ORIENTATION",
      holderId: "holder-a",
      orientation: "portrait",
    });
    expect(captureFraming(state, 1).aspectRatio).toBeCloseTo(0.75);
    expect(captureFraming(state, 2).aspectRatio).toBeCloseTo(4 / 3);
    state = run(state, {
      type: "SAVE_TEMPLATE",
      templateId: "orientation-template",
      name: "Mixed",
      folderIds: [state.templateFolders[0].id],
    });
    state = run(state, { type: "BEGIN_TEMPLATE_EDIT", templateId: "orientation-template" });
    expect(state.holderTransforms[0]).toMatchObject({
      holderId: "holder-a",
      orientation: "portrait",
    });
    expect(captureFraming(state, 1).aspectRatio).toBeCloseTo(0.75);
  });
  it("uses a full view with both guides when one capture is repeated across different holders", () => {
    let state = run(editor(), {
      type: "SET_HOLDER_ORIENTATION",
      holderId: "holder-a",
      orientation: "portrait",
    });
    state = run(state, {
      type: "SET_TEMPLATE_HOLDER_CAPTURE",
      holderId: "holder-b",
      captureSlot: 1,
    });
    expect(state.requiredCaptureCount).toBe(1);
    expect(captureFraming(state, 1).aspectRatio).toBeNull();
    expect(captureFraming(state, 1).guides).toEqual([0.75, 4 / 3]);
  });
  it("does not need multiple guides for repeated holders with the same shape", () => {
    const state = editor();
    state.customSlots[1].captureIndex = 0;
    expect(captureFraming(state, 1)).toEqual({ aspectRatio: 4 / 3, guides: [4 / 3] });
  });
  it("custom framing follows free resizing; rotation alone does not swap image proportions", () => {
    let state = run(editor(), {
      type: "SET_HOLDER_ORIENTATION",
      holderId: "holder-a",
      orientation: "portrait",
    });
    const previous = state.holderTransforms[0];
    state = run(state, {
      type: "UPDATE_HOLDER_TRANSFORM",
      slot: 1,
      holderId: "holder-a",
      transform: { ...previous, rotation: 45 },
    });
    expect(state.holderTransforms[0].orientation).toBe("portrait");
    state = run(state, {
      type: "UPDATE_HOLDER_TRANSFORM",
      slot: 1,
      holderId: "holder-a",
      transform: { ...previous, scaleX: previous.scaleX * 1.2 },
    });
    expect(state.holderTransforms[0].orientation).toBe("custom");
    expect(captureFraming(state, 1).aspectRatio).toBeCloseTo(0.9);
  });
  it("requires staff, an editable phase, an existing holder, and an unlocked holder", () => {
    const state = editor();
    const command: Command = {
      type: "SET_HOLDER_ORIENTATION",
      holderId: "holder-a",
      orientation: "portrait",
    };
    expect(() => reduceCommand(state, command, "customer")).toThrow("staff-only");
    expect(() => run({ ...state, phase: "countdown" }, command)).toThrow();
    expect(() => run(state, { ...command, holderId: "missing" })).toThrow("placeholder");
    state.holderTransforms = [
      { slot: 1, holderId: "holder-a", ...identityMediaTransform(), locked: true },
    ];
    expect(() => run(state, command)).toThrow("Unlock");
    expect(() =>
      run(editor(), { ...command, orientation: "invalid" } as unknown as Command),
    ).toThrow("valid photo orientation");
  });
  it("preserves holder IDs, rotations, locks and orientation during persisted-state normalization", () => {
    const original = {
      slot: 1,
      holderId: "holder-b",
      ...identityMediaTransform(),
      orientation: "portrait" as const,
      rotation: 17,
      locked: true,
    };
    expect(normalizeHolderTransform(JSON.parse(JSON.stringify(original)))).toEqual(original);
    const state = editor();
    state.customSlots[1].captureIndex = 0;
    state.holderTransforms = [original];
    expect(holderTransformFor(state.customSlots[1], state.holderTransforms)).toEqual(original);
    expect(holderTransformFor(slot, state.holderTransforms).locked).toBe(false);
  });
  it("infers legacy sizing without mutating old holders", () => {
    const transform = { slot: 1, ...identityMediaTransform() };
    expect(holderOrientation(slot, transform)).toBe("landscape");
    expect(holderOrientation({ ...slot, height: 440 }, transform)).toBe("custom");
    expect(transform).not.toHaveProperty("orientation");
  });
  it("chooses the retaken slot, not the number of photos already captured", () => {
    const state = {
      ...editor(),
      captureSequence: { kind: "retake" as const, slot: 2, remaining: 3 },
    };
    expect(activeCaptureSlot(state)).toBe(2);
    expect(
      activeCaptureSlot({ ...state, pendingCapture: { kind: "retake", slot: 1, revision: 2 } }),
    ).toBe(1);
  });
  it("draws centered crop guides in the full sensor view", () => {
    expect(guideBounds(16 / 9, 4 / 3)).toEqual({ left: 0.125, top: 0, width: 0.75, height: 1 });
    expect(guideBounds(4 / 3, 3 / 4).width).toBeCloseTo(0.5625);
  });
  it("uses originals for fitting and falls back safely for older photos", () => {
    const capture = { slot: 1, revision: 1, mediaUrl: "/media/crop.jpg", capturedAt: "test" };
    expect(sourcePhotoUrl(capture)).toBe(capture.mediaUrl);
    expect(sourcePhotoUrl({ ...capture, originalMediaUrl: "/media/original.jpg" })).toBe(
      "/media/original.jpg",
    );
  });
});
