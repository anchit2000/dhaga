"use client";

import { Select } from "@/components/ui/select";
import { getThemeFont, THEME_FONTS, type ThemeFontId } from "@/utils/constants/theme";

export function FontSelect({
  value,
  disabled,
  onChange,
}: {
  value: ThemeFontId;
  disabled: boolean;
  onChange: (font: ThemeFontId) => void;
}) {
  const selected = getThemeFont(value);

  return (
    <label className="block">
      <span className="text-xs text-fog">Font</span>
      <Select
        className="mt-1.5 h-11"
        aria-label="Font"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ThemeFontId)}
        // The trigger renders in the selected face, so the choice is legible
        // without opening the list.
        style={{ fontFamily: selected.stack ?? undefined }}
      >
        {THEME_FONTS.map((font) => (
          // Each option previews itself. The Google faces are declared with
          // `preload: false`, so the browser only fetches one once it has to
          // paint it — which is exactly when the list opens.
          <option key={font.id} value={font.id} style={{ fontFamily: font.stack ?? undefined }}>
            {font.label}
          </option>
        ))}
      </Select>
      <span className="mt-1.5 block text-xs text-fog">{selected.description}</span>
    </label>
  );
}
