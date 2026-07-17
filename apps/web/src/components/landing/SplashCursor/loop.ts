import type { FluidSimulation } from "./simulation";
import type { Pointer, SimConfig } from "./types";
import { wrap } from "./utils";

const IDLE_TIMEOUT_MS = 3000;

/**
 * Drives the fluid sim's per-frame step/render loop.
 *
 * The sim used to step and render every frame for the lifetime of the page,
 * competing with scrolling for GPU time even when the dye had fully
 * dissipated and nothing was visible. This loop pauses after
 * IDLE_TIMEOUT_MS with no pointer interaction: with DENSITY_DISSIPATION=5
 * the dye is gone well within that window, so pausing is invisible. wake()
 * resumes it on the next interaction.
 */
export function createFrameLoop(
  sim: FluidSimulation,
  pointer: Pointer,
  config: SimConfig,
): { start(): void; wake(): void; stop(): void } {
  let animationFrameId = 0;
  let lastUpdateTime = Date.now();
  let lastInteraction = Date.now();
  let colorUpdateTimer = 0;
  let idle = false;
  let stopped = false;

  function updateFrame() {
    if (stopped) return;
    const now = Date.now();
    const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
    lastUpdateTime = now;

    sim.resizeAndMaybeReinit();

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
      pointer.color = sim.generateColor();
    }

    if (pointer.moved) {
      pointer.moved = false;
      lastInteraction = now;
      sim.splat(
        pointer.texcoordX,
        pointer.texcoordY,
        pointer.deltaX * config.SPLAT_FORCE,
        pointer.deltaY * config.SPLAT_FORCE,
        pointer.color,
      );
    }

    sim.step(dt);
    sim.render();

    if (now - lastInteraction > IDLE_TIMEOUT_MS) {
      idle = true;
      return;
    }
    animationFrameId = requestAnimationFrame(updateFrame);
  }

  return {
    start() {
      lastUpdateTime = Date.now();
      lastInteraction = Date.now();
      updateFrame();
    },
    wake() {
      if (!idle || stopped) return;
      idle = false;
      // Reset both clocks so the first resumed frame doesn't integrate the
      // whole idle gap as one huge dt (the dt clamp already caps it, but
      // this also keeps the color timer honest).
      lastInteraction = Date.now();
      lastUpdateTime = Date.now();
      animationFrameId = requestAnimationFrame(updateFrame);
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(animationFrameId);
    },
  };
}
