import type { CSSProperties } from "react";

import { designs } from "../shared/catalog";

export function FrameColorPicker({
  selectedId,
  onSelect,
  compact = false,
}: {
  selectedId: string | null;
  onSelect: (designId: string) => void;
  compact?: boolean;
}) {
  const selectedDesign = designs.find((design) => design.id === selectedId);

  return (
    <fieldset
      className={`frame-color-picker ${compact ? "mini-designs" : "design-grid design-grid--frames"}`}
      aria-label="Frame color"
    >
      {compact && <span>Color</span>}
      {designs.map((design) => {
        const selected = selectedId === design.id;
        return (
          <button
            className={
              compact ? undefined : selected ? "design-card design-card--selected" : "design-card"
            }
            style={
              {
                "--accent": design.accent,
                "--background": design.background,
              } as CSSProperties
            }
            type="button"
            key={design.id}
            title={design.name}
            aria-label={`Use ${design.name}`}
            aria-pressed={selected}
            onClick={() => onSelect(design.id)}
          >
            {compact ? (
              selected && <b aria-hidden="true">✓</b>
            ) : (
              <>
                <span className="design-card__preview" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{design.name}</strong>
                <small>{design.description}</small>
                <span className="design-card__selection" aria-hidden="true">
                  ✓ Selected
                </span>
              </>
            )}
          </button>
        );
      })}
      {compact && selectedDesign && (
        <span className="mini-designs__selection" aria-hidden="true">
          {selectedDesign.name} selected
        </span>
      )}
    </fieldset>
  );
}
