import type { SimConfig } from "../types";
import { scaleByPixelRatio, type RGBColor } from "../utils";
import { getSupportedFormat } from "../webgl";
import { createBlitQuad, createBuffers, createPrograms, resizeBuffers, type SimFormats } from "./setup";
import { correctRadius as computeCorrectRadius, generateColor as computeGenerateColor, splat as runSplat } from "./splat";
import { runRender, runStep } from "./step";

export interface FluidSimulation {
  resizeAndMaybeReinit(): void;
  step(dt: number): void;
  render(): void;
  splat(x: number, y: number, dx: number, dy: number, color: RGBColor): void;
  generateColor(): RGBColor;
  correctRadius(radius: number): number;
}

/** Wires together shader/program compilation, framebuffers, and the
 * per-frame step/render/splat operations into one handle the component
 * drives. Returns null if the device can't support the required render
 * texture formats. */
export function createFluidSimulation(
  gl: WebGL2RenderingContext,
  config: SimConfig,
  supportLinearFiltering: boolean,
): FluidSimulation | null {
  const canvas = gl.canvas as HTMLCanvasElement;
  const type = gl.HALF_FLOAT;
  const rgba = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
  const rg = getSupportedFormat(gl, gl.RG16F, gl.RG, type);
  const r = getSupportedFormat(gl, gl.R16F, gl.RED, type);
  if (!rgba || !rg || !r) return null;
  const formats: SimFormats = { rgba, rg, r };

  const programs = createPrograms(gl, config, supportLinearFiltering);
  const blit = createBlitQuad(gl);
  const buffers = createBuffers(gl, config, formats, supportLinearFiltering);

  function resizeAndMaybeReinit() {
    const width = scaleByPixelRatio(canvas.clientWidth);
    const height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      resizeBuffers(gl, config, formats, supportLinearFiltering, programs, blit, buffers);
    }
  }

  return {
    resizeAndMaybeReinit,
    step: (dt) => runStep(gl, config, supportLinearFiltering, programs, buffers, blit, dt),
    render: () => runRender(gl, config, programs, buffers, blit),
    splat: (x, y, dx, dy, color) => runSplat(gl, canvas, config, programs, buffers, blit, x, y, dx, dy, color),
    generateColor: () => computeGenerateColor(config),
    correctRadius: (radius) => computeCorrectRadius(canvas, radius),
  };
}
