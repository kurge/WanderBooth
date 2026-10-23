import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { designs } from "../shared/catalog";
import { FrameColorPicker } from "./FrameColorPicker";

describe.each([false, true])("frame colors (compact: %s)", (compact) => {
  it("starts without a selected color", () => {
    render(<FrameColorPicker compact={compact} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(designs.length);
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/decoration|film edge|confetti|love hearts/i),
    ).not.toBeInTheDocument();
  });

  it.each(designs)("marks $name selected independently of its artwork colors", (design) => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <FrameColorPicker compact={compact} selectedId={null} onSelect={onSelect} />,
    );
    const button = screen.getByRole("button", { name: `Use ${design.name}` });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(design.id);
    rerender(<FrameColorPicker compact={compact} selectedId={design.id} onSelect={onSelect} />);
    expect(screen.getAllByRole("button", { pressed: true })).toEqual([button]);
    expect(button).toHaveTextContent("✓");
    if (!compact) expect(button).toHaveClass("design-card--selected");

    const next = designs.find((item) => item.id !== design.id);
    rerender(
      <FrameColorPicker compact={compact} selectedId={next?.id ?? null} onSelect={onSelect} />,
    );
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  });
});
