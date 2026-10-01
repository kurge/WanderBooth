import { describe, expect, it } from "vitest";

import { products } from "./catalog";
import { type BoothState, CommandError, initialBoothState, reduceCommand } from "./session";

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
  it("derives three captures from the selected 2×6 layout", () => {
    const state = completeSelection();
    expect(state.requiredCaptureCount).toBe(3);
    expect(state.phase).toBe("awaiting_cash");
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
