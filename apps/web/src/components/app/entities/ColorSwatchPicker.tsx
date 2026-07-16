"use client";

import { cn } from "@/lib/utils";
import { NODE_TYPE_COLOR_SWATCHES } from "@/utils/constants/graph";

/** Node-type colour choices (stored as raw hex) — swatch row styled after EventStyleFields. */
export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {NODE_TYPE_COLOR_SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`Colour ${hex}`}
          aria-pressed={value === hex}
          onClick={() => onChange(hex)}
          className={cn(
            "size-6 rounded-full ring-offset-2 ring-offset-panel transition-shadow",
            value === hex && "ring-2 ring-paper",
          )}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}
