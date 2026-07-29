/**
 * Why this exists: WRAPPED_CARD_COLORS is a hand-copied snapshot of
 * globals.css's `.dark` brand tokens, kept only because satori (next/og) has
 * no access to CSS custom properties. A hand-copied snapshot silently rots —
 * someone repaints a `--brand-*` value in globals.css and the OG image keeps
 * shipping the old color with no error anywhere. This test fails the moment
 * that happens, by parsing the live `.dark` block out of globals.css and
 * diffing it against the snapshot, instead of just re-asserting the same
 * hardcoded hex values back at the constant.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { WRAPPED_CARD_COLORS } from "./wrapped";

const GLOBALS_CSS_URL = new URL("../../app/globals.css", import.meta.url);

/** camelCase constant key -> kebab-case `--brand-*` suffix (panel2 -> panel-2). */
function toCssVarSuffix(key: string): string {
  return key.replace(/([0-9])/g, "-$1").replace(/([A-Z])/g, "-$1").toLowerCase();
}

function readDarkBrandTokens(): Record<string, string> {
  const css = readFileSync(fileURLToPath(GLOBALS_CSS_URL), "utf-8");
  const darkBlock = css.match(/\.dark\s*\{([^}]*)\}/);
  if (!darkBlock) {
    throw new Error("Could not find a `.dark { ... }` block in globals.css");
  }
  const tokens: Record<string, string> = {};
  for (const m of darkBlock[1].matchAll(/--brand-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2].toLowerCase();
  }
  return tokens;
}

describe("WRAPPED_CARD_COLORS", () => {
  it("matches the live .dark --brand-* tokens in globals.css", () => {
    const darkTokens = readDarkBrandTokens();
    for (const [key, value] of Object.entries(WRAPPED_CARD_COLORS)) {
      const cssVar = `--brand-${toCssVarSuffix(key)}`;
      expect(darkTokens[toCssVarSuffix(key)], `${cssVar} (constants key "${key}")`).toBe(
        value.toLowerCase(),
      );
    }
  });
});
