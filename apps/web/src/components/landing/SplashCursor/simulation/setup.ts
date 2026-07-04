import {
  ADVECTION_SHADER,
  BASE_VERTEX_SHADER,
  CLEAR_SHADER,
  COPY_SHADER,
  CURL_SHADER,
  DISPLAY_SHADER_SOURCE,
  DIVERGENCE_SHADER,
  GRADIENT_SUBTRACT_SHADER,
  PRESSURE_SHADER,
  SPLAT_SHADER,
  VORTICITY_SHADER,
} from "../shaders";
import type { FBO, SimBuffers, SimConfig, SimPrograms, TextureFormat } from "../types";
import { compileShader, createDoubleFBO, createFBO, getResolution, Material, Program, resizeDoubleFBO } from "../webgl";

export interface SimFormats {
  rgba: TextureFormat;
  rg: TextureFormat;
  r: TextureFormat;
}

export function createPrograms(
  gl: WebGL2RenderingContext,
  config: SimConfig,
  supportLinearFiltering: boolean,
): SimPrograms {
  const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, BASE_VERTEX_SHADER);
  const advectionKeywords = supportLinearFiltering ? undefined : ["MANUAL_FILTERING"];
  const display = new Material(gl, baseVertexShader, DISPLAY_SHADER_SOURCE);
  display.setKeywords(config.SHADING ? ["SHADING"] : []);

  const program = (source: string, keywords?: string[]) =>
    new Program(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, source, keywords));

  return {
    copy: program(COPY_SHADER),
    clear: program(CLEAR_SHADER),
    splat: program(SPLAT_SHADER),
    advection: program(ADVECTION_SHADER, advectionKeywords),
    divergence: program(DIVERGENCE_SHADER),
    curl: program(CURL_SHADER),
    vorticity: program(VORTICITY_SHADER),
    pressure: program(PRESSURE_SHADER),
    gradientSubtract: program(GRADIENT_SUBTRACT_SHADER),
    display,
  };
}

export function createBlitQuad(gl: WebGL2RenderingContext): (target: FBO | null) => void {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return (target: FBO | null) => {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
}

export function createBuffers(
  gl: WebGL2RenderingContext,
  config: SimConfig,
  formats: SimFormats,
  supportLinearFiltering: boolean,
): SimBuffers {
  const type = gl.HALF_FLOAT;
  const simRes = getResolution(gl, config.SIM_RESOLUTION);
  const dyeRes = getResolution(gl, config.DYE_RESOLUTION);
  const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  return {
    dye: createDoubleFBO(gl, dyeRes.width, dyeRes.height, formats.rgba.internalFormat, formats.rgba.format, type, filtering),
    velocity: createDoubleFBO(gl, simRes.width, simRes.height, formats.rg.internalFormat, formats.rg.format, type, filtering),
    divergence: createFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST),
    curl: createFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST),
    pressure: createDoubleFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST),
  };
}

/** Resizes the content-preserving buffers (dye/velocity) and simply
 * recreates the scratch ones (divergence/curl/pressure), matching the
 * original: only dye/velocity need continuity across a resize. */
export function resizeBuffers(
  gl: WebGL2RenderingContext,
  config: SimConfig,
  formats: SimFormats,
  supportLinearFiltering: boolean,
  programs: SimPrograms,
  blit: (target: FBO | null) => void,
  buffers: SimBuffers,
): void {
  const type = gl.HALF_FLOAT;
  const simRes = getResolution(gl, config.SIM_RESOLUTION);
  const dyeRes = getResolution(gl, config.DYE_RESOLUTION);
  const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
  gl.disable(gl.BLEND);

  resizeDoubleFBO(gl, programs.copy, blit, buffers.dye, dyeRes.width, dyeRes.height, formats.rgba.internalFormat, formats.rgba.format, type, filtering);
  resizeDoubleFBO(gl, programs.copy, blit, buffers.velocity, simRes.width, simRes.height, formats.rg.internalFormat, formats.rg.format, type, filtering);

  buffers.divergence = createFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST);
  buffers.curl = createFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST);
  buffers.pressure = createDoubleFBO(gl, simRes.width, simRes.height, formats.r.internalFormat, formats.r.format, type, gl.NEAREST);
}
