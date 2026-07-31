import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND_STOCK_SWATCHES } from "./brand";

/**
 * Rule 9 tripwire for a hand-copied mirror.
 *
 * `BRAND_STOCK_SWATCHES` exists because the appearance picker cannot read the
 * stock palette live — a user with another preset applied has `--brand-*`
 * overridden at `:root`. So the Dhaga swatch is the ONE place in the product
 * showing brand colours that globals.css isn't feeding. If a designer retunes
 * the ground in globals.css and this copy is not updated, the picker quietly
 * advertises a colour the app no longer uses, and nothing else breaks to say so.
 *
 * This test is that alarm: it re-reads the real stylesheet, so it fails on the
 * drift rather than on a restatement of the same constants.
 */
const CSS = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);

/** The declared value of `property` inside the first `selector { … }` block. */
function declaredValue(selector: string, property: string): string {
  const block = CSS.slice(CSS.indexOf(`\n${selector} {`));
  const match = new RegExp(`${property}:\\s*([^;]+);`).exec(
    block.slice(0, block.indexOf("\n}")),
  );
  if (!match) throw new Error(`globals.css: ${selector} declares no ${property}`);
  return match[1].trim();
}

describe("BRAND_STOCK_SWATCHES mirrors globals.css", () => {
  it.each([
    ["light", ":root"],
    ["dark", ".dark"],
  ] as const)("%s matches the %s block", (mode, selector) => {
    expect(BRAND_STOCK_SWATCHES[mode]).toEqual({
      ink: declaredValue(selector, "--brand-ink"),
      panel: declaredValue(selector, "--brand-panel"),
      accent: declaredValue(selector, "--brand-amber"),
    });
  });
});
