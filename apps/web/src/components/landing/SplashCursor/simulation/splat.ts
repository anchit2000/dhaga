import type { FBO, SimBuffers, SimConfig, SimPrograms } from "../types";
import { hexToRGB, hsvToRGB, type RGBColor } from "../utils";

export function generateColor(config: SimConfig): RGBColor {
  if (!config.RAINBOW_MODE) return hexToRGB(config.COLOR);
  const c = hsvToRGB(Math.random(), 1, 1);
  return { r: c.r * 0.15, g: c.g * 0.15, b: c.b * 0.15 };
}

export function correctRadius(canvas: HTMLCanvasElement, radius: number): number {
  const aspectRatio = canvas.width / canvas.height;
  return aspectRatio > 1 ? radius * aspectRatio : radius;
}

export function splat(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  config: SimConfig,
  programs: SimPrograms,
  buffers: SimBuffers,
  blit: (target: FBO | null) => void,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: RGBColor,
): void {
  const { velocity, dye } = buffers;
  programs.splat.bind();
  gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
  gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(programs.splat.uniforms.point, x, y);
  gl.uniform3f(programs.splat.uniforms.color, dx, dy, 0);
  gl.uniform1f(programs.splat.uniforms.radius, correctRadius(canvas, config.SPLAT_RADIUS / 100));
  blit(velocity.write);
  velocity.swap();

  gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
  gl.uniform3f(programs.splat.uniforms.color, color.r, color.g, color.b);
  blit(dye.write);
  dye.swap();
}
