import type { RGBColor } from "./utils";
import type { Material, Program } from "./webgl";

export interface TextureFormat {
  internalFormat: number;
  format: number;
}

export interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

export interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

export interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: RGBColor;
}

export function createPointer(): Pointer {
  return {
    id: -1,
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    down: false,
    moved: false,
    color: { r: 0, g: 0, b: 0 },
  };
}

export interface SimConfig {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLOR_UPDATE_SPEED: number;
  BACK_COLOR: RGBColor;
  TRANSPARENT: boolean;
  RAINBOW_MODE: boolean;
  COLOR: string;
}

export interface SimPrograms {
  copy: Program;
  clear: Program;
  splat: Program;
  advection: Program;
  divergence: Program;
  curl: Program;
  vorticity: Program;
  pressure: Program;
  gradientSubtract: Program;
  display: Material;
}

/** Mutated in place (properties reassigned on resize) rather than replaced,
 * so `step`/`render` in a different module always see the current buffers. */
export interface SimBuffers {
  dye: DoubleFBO;
  velocity: DoubleFBO;
  divergence: FBO;
  curl: FBO;
  pressure: DoubleFBO;
}

