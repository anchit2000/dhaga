"use client";

import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BRAND_STOCK_SWATCHES } from "@/utils/constants/brand";
import { THEME_PRESETS, type ThemePreset, type ThemePresetId } from "@/utils/constants/theme";

/**
 * Ground / panel / accent for one preset in the mode the user is actually
 * looking at. Every preset ships a light AND a dark palette, so the swatches
 * have to follow the light/dark toggle — showing the dark palette to someone in
 * light mode would advertise colours they will never see.
 */
function swatches(preset: ThemePreset, mode: "light" | "dark"): string[] {
  if (!preset.palettes) {
    const stock = BRAND_STOCK_SWATCHES[mode];
    return [stock.ink, stock.panel, stock.accent];
  }
  const palette = preset.palettes[mode];
  return [palette.ink, palette.panel, palette.amber];
}

export function PresetGrid({
  value,
  disabled,
  onChange,
}: {
  value: ThemePresetId;
  disabled: boolean;
  onChange: (preset: ThemePresetId) => void;
}) {
  // Undefined until next-themes mounts, which is also what the server rendered,
  // so the first client paint matches the HTML and only then re-resolves.
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "light" ? "light" : "dark";

  return (
    <fieldset>
      <legend className="text-xs text-fog">Colour theme</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as ThemePresetId)}
        disabled={disabled}
        aria-label="Colour theme"
        className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {THEME_PRESETS.map((preset) => (
          <label
            key={preset.id}
            title={preset.description}
            className="flex min-h-11 cursor-pointer flex-col gap-2.5 rounded-xl border border-seam bg-panel p-3 transition-colors has-[[data-checked]]:border-amber has-[[data-checked]]:ring-2 has-[[data-checked]]:ring-amber/50"
          >
            <span className="flex items-center gap-2">
              <RadioGroupItem value={preset.id} />
              <span className="min-w-0 truncate text-sm text-paper">{preset.label}</span>
            </span>
            {/* Decorative: the label above already names the choice. */}
            <span className="flex gap-1" aria-hidden>
              {swatches(preset, mode).map((color, index) => (
                <span
                  key={index}
                  className="size-5 rounded-full border border-seam"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
