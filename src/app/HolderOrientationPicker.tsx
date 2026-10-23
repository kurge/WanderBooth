import { type PhotoSlot, photoSlotId } from "../shared/catalog";
import type { Command, HolderTransform } from "../shared/session";
import {
  holderOrientation,
  holderTransformFor,
  type PhotoOrientation,
} from "../shared/templateFraming";

export function HolderOrientationPicker({
  slot,
  transforms,
  sendCommand,
  label = "Photo orientation",
}: {
  slot: PhotoSlot;
  transforms: HolderTransform[];
  sendCommand: (command: Command) => void;
  label?: string;
}) {
  const transform = holderTransformFor(slot, transforms);
  return (
    <label className="holder-orientation">
      {label}
      <select
        aria-label={label}
        value={holderOrientation(slot, transform)}
        disabled={transform.locked}
        onChange={(event) =>
          sendCommand({
            type: "SET_HOLDER_ORIENTATION",
            holderId: photoSlotId(slot),
            orientation: event.target.value as PhotoOrientation,
          })
        }
      >
        <option value="landscape">Landscape · 4:3</option>
        <option value="portrait">Portrait · 3:4</option>
        <option value="custom">Custom · free sizing</option>
      </select>
      {transform.locked && <small>Unlock the holder to change orientation.</small>}
    </label>
  );
}
