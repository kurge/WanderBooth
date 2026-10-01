import { describe, expect, it } from "vitest";

import { products } from "./catalog";
import { CommandError, initialBoothState, reduceCommand } from "./session";

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

  it("rejects unknown designs", () => {
    const state = beginSelection();
    expect(() =>
      reduceCommand(state, { type: "SELECT_DESIGN", designId: "not-real" }, "attendant"),
    ).toThrow("not available");
  });

  it("preserves the selected mode and increments once when reset", () => {
    const state = { ...initialBoothState(), operationMode: "self_service" as const, revision: 9 };
    const reset = reduceCommand(state, { type: "RESET" }, "owner");
    expect(reset.operationMode).toBe("self_service");
    expect(reset.revision).toBe(10);
    expect(reset.phase).toBe("idle");
  });
});
