"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";
import { buildUserThemeCss } from "@/lib/theme/css";
import { resetUiThemeAction, setUiThemeAction } from "@/lib/actions/settings";
import {
  DEFAULT_UI_THEME,
  isDefaultUiTheme,
  type UiTheme,
} from "@/utils/constants/theme";
import { FontSelect } from "./font-select";
import { PresetGrid } from "./preset-grid";

const PREVIEW_STYLE_ID = "dhaga-theme-preview";

/**
 * Paints `theme` onto the live document immediately, so a pick lands before the
 * server round trip rather than after it.
 *
 * It writes a <style> rather than custom properties on `document.documentElement`
 * on purpose. Inline properties beat every selector, including the `.dark` arm
 * of globals.css — so an inline preview would still be in force after the user
 * later flipped the top-bar toggle, serving the light palette in dark mode with
 * no way to shake it off. A <style> carrying the same two rules the server emits
 * (`:root:root:root` plus a `.dark` arm) resolves per mode exactly as the
 * persisted stylesheet does.
 *
 * A null build means "fully default", and then the element must GO: leaving it
 * behind with its previous contents would keep the old theme applied through a
 * reset. (The stylesheet the SERVER rendered for the old theme is still in the
 * document until the action's revalidation commits — that is what the button's
 * spinner covers.)
 */
function applyPreview(theme: UiTheme): void {
  const css = buildUserThemeCss(theme);
  const existing = document.getElementById(PREVIEW_STYLE_ID);
  if (!css) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.textContent = css;
    return;
  }
  const style = document.createElement("style");
  style.id = PREVIEW_STYLE_ID;
  style.textContent = css;
  document.head.append(style);
}

/**
 * Per-user palette + font for /app. Optimistic like the other one-click
 * settings: the theme applies on click, and a failed write reverts the value
 * (which re-runs the preview effect, so the document reverts with it) and toasts
 * instead of throwing the whole settings page into the error boundary.
 */
export function AppearanceSetting({ theme }: { theme: UiTheme }) {
  const { value, pending, set } = useOptimisticToggle<UiTheme>({
    value: theme,
    mutate: async (next) => {
      if (isDefaultUiTheme(next)) {
        await resetUiThemeAction();
        return;
      }
      const formData = new FormData();
      formData.set("preset", next.preset);
      formData.set("font", next.font);
      await setUiThemeAction(formData);
    },
    errorMessage: "Couldn't save your appearance — try again.",
  });

  useEffect(() => {
    applyPreview(value);
  }, [value]);

  return (
    <section
      id="appearance"
      data-tour="appearance"
      className="scroll-mt-20 space-y-5 rounded-2xl border border-seam bg-panel p-5 sm:p-6"
    >
      <div>
        <p className="text-sm font-medium text-paper">Appearance</p>
        <p className="mt-1 text-sm text-fog">
          Changes how the Dhaga app looks, for you alone — the public site, docs
          and blog keep Dhaga&apos;s own colours. Light and dark is still the
          toggle in the top bar: every theme here ships both a light and a dark
          palette, so the toggle keeps working whichever one you pick.
        </p>
      </div>

      <PresetGrid
        value={value.preset}
        disabled={pending}
        onChange={(preset) => set({ ...value, preset })}
      />

      <FontSelect
        value={value.font}
        disabled={pending}
        onChange={(font) => set({ ...value, font })}
      />

      <div className="border-t border-seam pt-4">
        <Button
          variant="outline"
          size="sm"
          // `line` rather than the variant's own wash-alpha border: this button
          // has to stay visible on every preset's panel, including the two
          // neutrals, and `line` is the token held to the 3:1 minimum.
          className="border-line/60"
          // Only the RESET is in flight when the optimistic value is already
          // default — spinning this button during a preset or font save would
          // point the feedback at the wrong control.
          loading={pending && isDefaultUiTheme(value)}
          disabled={pending || isDefaultUiTheme(value)}
          onClick={() => set(DEFAULT_UI_THEME)}
        >
          Reset to default
        </Button>
      </div>
    </section>
  );
}
