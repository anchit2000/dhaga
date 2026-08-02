import { describe, expect, it } from "vitest";
import { buildUserThemeCss } from "../css";
import { DEFAULT_UI_THEME, PALETTE_VAR } from "@/utils/constants/theme";

describe("buildUserThemeCss", () => {
  it("emits nothing at all for the stock theme", () => {
    // Not an empty rule — nothing. A user who never opens the picker must pay
    // zero bytes and get exactly the palette globals.css ships.
    expect(buildUserThemeCss(DEFAULT_UI_THEME)).toBeNull();
  });

  it("overrides every --brand-* property a surface can resolve", () => {
    const css = buildUserThemeCss({ preset: "ocean", font: "default" });
    expect(css).not.toBeNull();
    // A missing property is a half-themed UI: that one surface keeps Dhaga's
    // amber while everything around it turns blue.
    for (const property of Object.values(PALETTE_VAR)) {
      expect(css, `missing ${property}`).toContain(`${property}:`);
    }
  });

  it("keeps the original Dhaga palette available as Classic", () => {
    const css = buildUserThemeCss({ preset: "classic", font: "default" }) ?? "";
    expect(css).toContain("--brand-ink:#f7f5ef");
    expect(css).toContain("--brand-panel:#fffdfa");
    expect(css).toContain("--brand-ink:#101112");
    expect(css).toContain("--brand-amber:#e2a44c");
  });

  it("wins on specificity in both modes, including forced-dark subtrees", () => {
    const css = buildUserThemeCss({ preset: "rose", font: "default" }) ?? "";
    // (0,3,0) and (0,4,0) beat globals.css's :root / .dark at (0,1,0)
    // regardless of stylesheet order — a <style> from a nested layout has no
    // guaranteed position relative to the imported global sheet.
    expect(css).toContain(":root:root:root{");
    expect(css).toContain(":root:root:root.dark");
    // The descendant arm covers the components that force a .dark subtree
    // mid-page (camera capture, photo cropper); without it those keep the
    // stock palette while the rest of the page is themed.
    expect(css).toContain(":root:root:root .dark");
  });

  it("emits the font on a font-only change, with no palette rule", () => {
    const css = buildUserThemeCss({ preset: "default", font: "inter" }) ?? "";
    // BOTH font vars: overriding --font-sans alone leaves every heading on
    // Geist Pixel while body text changes.
    expect(css).toContain("--font-sans:var(--font-inter)");
    expect(css).toContain("--font-display:var(--font-inter)");
    expect(css).not.toContain(".dark");
    expect(css).not.toContain("--brand-ink");
  });

  it("carries both the palette and the font when both are set", () => {
    const css = buildUserThemeCss({ preset: "forest", font: "poppins" }) ?? "";
    expect(css).toContain("--brand-ink:");
    expect(css).toContain("--font-display:var(--font-poppins)");
  });
});
