"use client";

import { useEffect, useRef } from "react";
import { createPointerController } from "./pointerEvents";
import { createFluidSimulation } from "./simulation";
import type { SimConfig } from "./types";
import { wrap, type RGBColor } from "./utils";

export interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: RGBColor;
  TRANSPARENT?: boolean;
  RAINBOW_MODE?: boolean;
  COLOR?: string;
}

/**
 * WebGL fluid simulation trailing the cursor with a soft amber wisp, toned
 * down from React Bits' default rainbow/high-force preset to match the
 * site's single-accent-color restraint. Skips entirely under
 * prefers-reduced-motion (the source component had no such guard, but every
 * other animated component here does).
 *
 * The actual simulation lives in ./simulation, split from the pointer/DOM
 * wiring here so the WebGL program/framebuffer plumbing isn't tangled up
 * with React lifecycle and event-listener concerns.
 */
export function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  DENSITY_DISSIPATION = 5,
  VELOCITY_DISSIPATION = 2.5,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 2,
  SPLAT_RADIUS = 0.15,
  SPLAT_FORCE = 3000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0.5, g: 0, b: 0 },
  TRANSPARENT = true,
  RAINBOW_MODE = false,
  COLOR = "#e2a44c",
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const gl = canvasEl.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    gl.getExtension("EXT_color_buffer_float");
    const supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
    gl.clearColor(0, 0, 0, 1);

    const config: SimConfig = {
      SIM_RESOLUTION,
      DYE_RESOLUTION: supportLinearFiltering ? DYE_RESOLUTION : 256,
      DENSITY_DISSIPATION,
      VELOCITY_DISSIPATION,
      PRESSURE,
      PRESSURE_ITERATIONS,
      CURL,
      SPLAT_RADIUS,
      SPLAT_FORCE,
      SHADING: supportLinearFiltering ? SHADING : false,
      COLOR_UPDATE_SPEED,
      BACK_COLOR,
      TRANSPARENT,
      RAINBOW_MODE,
      COLOR,
    };

    const sim = createFluidSimulation(gl, config, supportLinearFiltering);
    if (!sim) return;

    const { pointer, bind } = createPointerController(canvasEl, sim);
    const unbind = bind();

    let isActive = true;
    let animationFrameId = 0;
    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0;

    function updateFrame() {
      if (!isActive) return;
      const now = Date.now();
      const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
      lastUpdateTime = now;

      sim!.resizeAndMaybeReinit();

      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointer.color = sim!.generateColor();
      }

      if (pointer.moved) {
        pointer.moved = false;
        sim!.splat(
          pointer.texcoordX,
          pointer.texcoordY,
          pointer.deltaX * config.SPLAT_FORCE,
          pointer.deltaY * config.SPLAT_FORCE,
          pointer.color,
        );
      }

      sim!.step(dt);
      sim!.render();
      animationFrameId = requestAnimationFrame(updateFrame);
    }
    updateFrame();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
      unbind();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      <canvas ref={canvasRef} className="block h-screen w-screen" />
    </div>
  );
}
