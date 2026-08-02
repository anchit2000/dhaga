import { describe, expect, it } from "vitest";
import {
  DEFAULT_UI_THEME,
  isDefaultUiTheme,
  parseUiTheme,
  serializeUiTheme,
  THEME_FONT_VARS,
} from "..";

/**
 * parseUiTheme is the compatibility boundary for a value that outlives the code
 * that wrote it: a row written by a newer build, a rollback that removed a
 * preset, a hand-edited settings table. It must never throw and never leave a
 * field unset — a corrupt row degrading to the brand is fine, a 500 on the /app
 * shell (which reads this on every navigation) is not.
 */
describe("parseUiTheme", () => {
  it("falls back on a missing value", () => {
    expect(parseUiTheme(null)).toEqual(DEFAULT_UI_THEME);
    expect(parseUiTheme("")).toEqual(DEFAULT_UI_THEME);
  });

  it("falls back on garbage that is not JSON", () => {
    expect(parseUiTheme("{not json")).toEqual(DEFAULT_UI_THEME);
  });

  it("falls back on JSON that is not an object", () => {
    expect(parseUiTheme("42")).toEqual(DEFAULT_UI_THEME);
    expect(parseUiTheme("null")).toEqual(DEFAULT_UI_THEME);
    expect(parseUiTheme('"rose"')).toEqual(DEFAULT_UI_THEME);
  });

  it("keeps the valid half when only one id is unknown", () => {
    // Per-FIELD fallback, not whole-object: a user whose preset was removed by
    // a rollback must not silently lose their font choice as well.
    expect(parseUiTheme('{"preset":"nope","font":"inter"}')).toEqual({
      preset: "default",
      font: "inter",
    });
    expect(parseUiTheme('{"preset":"rose","font":"comic"}')).toEqual({
      preset: "rose",
      font: "default",
    });
  });

  it("fills in a key the stored object never had", () => {
    expect(parseUiTheme('{"preset":"ocean"}')).toEqual({
      preset: "ocean",
      font: "default",
    });
    expect(parseUiTheme("{}")).toEqual(DEFAULT_UI_THEME);
  });

  it("ignores non-string ids rather than coercing them", () => {
    expect(parseUiTheme('{"preset":7,"font":{"id":"inter"}}')).toEqual(
      DEFAULT_UI_THEME,
    );
  });

  it("round-trips a valid theme", () => {
    const theme = { preset: "violet", font: "poppins" } as const;
    expect(parseUiTheme(serializeUiTheme(theme))).toEqual(theme);
  });

  it("accepts the retained Dhaga Classic preset", () => {
    expect(parseUiTheme('{"preset":"classic","font":"default"}')).toEqual({
      preset: "classic",
      font: "default",
    });
  });
});

describe("isDefaultUiTheme", () => {
  it("is true only when BOTH fields are stock", () => {
    // buildUserThemeCss keys the "emit nothing" path off this, so a font-only
    // change reporting `true` would silently drop the user's font.
    expect(isDefaultUiTheme(DEFAULT_UI_THEME)).toBe(true);
    expect(isDefaultUiTheme({ preset: "default", font: "inter" })).toBe(false);
    expect(isDefaultUiTheme({ preset: "rose", font: "default" })).toBe(false);
  });
});

describe("THEME_FONT_VARS", () => {
  it("matches the CSS variable names the root layout declares", () => {
    // next/font requires explicitly written literals, so app/layout.tsx cannot
    // import these — it repeats them. Pinning them here means renaming one
    // without the other fails a test instead of silently falling back to the
    // system stack at runtime.
    expect(THEME_FONT_VARS).toEqual({
      inter: "--font-inter",
      roboto: "--font-roboto",
      "open-sans": "--font-open-sans",
      lato: "--font-lato",
      montserrat: "--font-montserrat",
      poppins: "--font-poppins",
    });
  });
});
