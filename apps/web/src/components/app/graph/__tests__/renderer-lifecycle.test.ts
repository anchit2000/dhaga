import { describe, expect, it } from "vitest";
import { isRendererAlive, trackRendererDeath } from "../canvas/renderer-lifecycle";

/** Minimal stand-in for sigma's "kill" event surface. */
function fakeSigma(): { on: (type: "kill", handler: () => void) => void; kill: () => void } {
  let onKill: (() => void) | null = null;
  return {
    on: (type, handler) => {
      if (type === "kill") onKill = handler;
    },
    kill: () => onKill?.(),
  };
}

describe("renderer lifecycle tracking", () => {
  // Sigma's kill() empties the program registries, so a refresh() on a killed
  // instance throws (`could not find a suitable program for node type
  // "circle"`). On a background-revalidation payload swap, sibling hooks in
  // the same React commit still hold the killed renderer through stale state
  // — the alive check is what turns that crash into a skipped frame
  // (crashed live 2/2 on 200-swaps, 2026-07-17; 304 boots never crashed).
  it("reports a renderer dead exactly from its kill event onward", () => {
    const sigma = fakeSigma();
    trackRendererDeath(sigma);
    expect(isRendererAlive(sigma)).toBe(true);
    sigma.kill();
    expect(isRendererAlive(sigma)).toBe(false);
  });

  it("treats untracked instances as alive (first mount has no history)", () => {
    expect(isRendererAlive(fakeSigma())).toBe(true);
  });

  it("tracks deaths per instance — a swap's new renderer is unaffected by the old one's kill", () => {
    const old = fakeSigma();
    const replacement = fakeSigma();
    trackRendererDeath(old);
    trackRendererDeath(replacement);
    old.kill();
    expect(isRendererAlive(old)).toBe(false);
    expect(isRendererAlive(replacement)).toBe(true);
  });
});
