/**
 * Sigma's kill() empties its program registries, so any later refresh()
 * throws `could not find a suitable program for node type "circle"`. On a
 * background-revalidation payload swap, useRenderer kills the old instance
 * in its effect cleanup while sibling hooks — rendered in the SAME React
 * commit — still hold that instance through state and fire with fresh deps
 * (crashed live, 2/2, 2026-07-17; 304 boots never swap and never crashed).
 * Deaths are tracked here so those effects can no-op; the very next render
 * hands them the replacement renderer.
 *
 * Kept free of any sigma import: sigma references WebGL2RenderingContext at
 * module scope and cannot load under node (vitest).
 */
const killedRenderers = new WeakSet<object>();

export function trackRendererDeath(renderer: {
  on: (type: "kill", handler: () => void) => unknown;
}): void {
  renderer.on("kill", () => killedRenderers.add(renderer));
}

export function isRendererAlive(renderer: object): boolean {
  return !killedRenderers.has(renderer);
}
