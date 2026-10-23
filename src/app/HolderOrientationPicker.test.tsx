import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { identityMediaTransform } from "../shared/catalog";
import { initialBoothState } from "../shared/session";
import { CapturePreview, LiveCameraPreview } from "./App";
import { HolderOrientationPicker } from "./HolderOrientationPicker";

const slot = {
  id: "holder-1",
  captureIndex: 0,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  shape: "rectangle" as const,
};
const state = () => ({
  ...initialBoothState(),
  layoutId: "custom-portrait-4x6",
  customSlots: [slot],
  requiredCaptureCount: 1,
});
describe("holder orientation and matching previews", () => {
  it("offers all presets and sends a holder-specific command", () => {
    const sendCommand = vi.fn();
    render(<HolderOrientationPicker slot={slot} transforms={[]} sendCommand={sendCommand} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "portrait" } });
    expect(sendCommand).toHaveBeenCalledWith({
      type: "SET_HOLDER_ORIENTATION",
      holderId: "holder-1",
      orientation: "portrait",
    });
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
  it("disables orientation for locked holders", () => {
    render(
      <HolderOrientationPicker
        slot={slot}
        transforms={[{ slot: 1, holderId: slot.id, ...identityMediaTransform(), locked: true }]}
        sendCommand={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
  it("switches live orientation between captures, including a portrait retake", () => {
    const s = {
      ...state(),
      customSlots: [
        { ...slot, width: 300, height: 400 },
        { ...slot, id: "holder-2", captureIndex: 1 },
      ],
    };
    const { rerender } = render(<LiveCameraPreview state={s} />);
    expect(screen.getByRole("region", { name: "Live camera preview" })).toHaveStyle({
      aspectRatio: ".75",
    });
    expect(screen.getByText("Portrait · 3:4")).toBeInTheDocument();
    const capture = { slot: 1, revision: 1, mediaUrl: "/test.jpg", capturedAt: "test" };
    rerender(<LiveCameraPreview state={{ ...s, captures: [capture] }} />);
    expect(screen.getByText("Landscape · 4:3")).toBeInTheDocument();
    rerender(
      <LiveCameraPreview
        state={{
          ...s,
          captures: [capture],
          captureSequence: { kind: "retake", slot: 1, remaining: 3 },
        }}
      />,
    );
    expect(screen.getByText("Portrait · 3:4")).toBeInTheDocument();
  });
  it("shows both crop guides for shared mixed-orientation captures", () => {
    const s = {
      ...state(),
      customSlots: [slot, { ...slot, id: "holder-2", width: 300, height: 400 }],
    };
    render(<LiveCameraPreview state={s} sourceAspect={16 / 9} />);
    expect(screen.getByText("Portrait crop")).toBeInTheDocument();
    expect(screen.getByText("Landscape crop")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Live camera preview" })).toHaveStyle({
      aspectRatio: String(16 / 9),
    });
  });
  it("matches waiting and captured card shapes and respects actual saved dimensions", () => {
    const s = { ...state(), customSlots: [{ ...slot, width: 300, height: 400 }] };
    const { rerender } = render(<CapturePreview state={s} />);
    expect(screen.getByRole("figure")).toHaveStyle({ aspectRatio: ".75" });
    rerender(
      <CapturePreview
        state={{
          ...s,
          captures: [
            {
              slot: 1,
              revision: 1,
              mediaUrl: "/test.jpg",
              capturedAt: "test",
              pixelWidth: 675,
              pixelHeight: 900,
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("figure")).toHaveStyle({ aspectRatio: ".75" });
  });
});
