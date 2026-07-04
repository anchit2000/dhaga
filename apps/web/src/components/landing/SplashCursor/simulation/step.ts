import type { FBO, SimBuffers, SimConfig, SimPrograms } from "../types";

export function runStep(
  gl: WebGL2RenderingContext,
  config: SimConfig,
  supportLinearFiltering: boolean,
  programs: SimPrograms,
  buffers: SimBuffers,
  blit: (target: FBO | null) => void,
  dt: number,
): void {
  const { velocity, dye, divergence, curl, pressure } = buffers;
  gl.disable(gl.BLEND);

  programs.curl.bind();
  gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
  blit(curl);

  programs.vorticity.bind();
  gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(programs.vorticity.uniforms.uCurl, curl.attach(1));
  gl.uniform1f(programs.vorticity.uniforms.curl, config.CURL);
  gl.uniform1f(programs.vorticity.uniforms.dt, dt);
  blit(velocity.write);
  velocity.swap();

  programs.divergence.bind();
  gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
  blit(divergence);

  programs.clear.bind();
  gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
  gl.uniform1f(programs.clear.uniforms.value, config.PRESSURE);
  blit(pressure.write);
  pressure.swap();

  programs.pressure.bind();
  gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0));
  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
    blit(pressure.write);
    pressure.swap();
  }

  programs.gradientSubtract.bind();
  gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0));
  gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1));
  blit(velocity.write);
  velocity.swap();

  programs.advection.bind();
  gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  if (!supportLinearFiltering) {
    gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
  }
  const velocityId = velocity.read.attach(0);
  gl.uniform1i(programs.advection.uniforms.uVelocity, velocityId);
  gl.uniform1i(programs.advection.uniforms.uSource, velocityId);
  gl.uniform1f(programs.advection.uniforms.dt, dt);
  gl.uniform1f(programs.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
  blit(velocity.write);
  velocity.swap();

  if (!supportLinearFiltering) {
    gl.uniform2f(programs.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
  }
  gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
  gl.uniform1f(programs.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
  blit(dye.write);
  dye.swap();
}

export function runRender(gl: WebGL2RenderingContext, config: SimConfig, programs: SimPrograms, buffers: SimBuffers, blit: (target: FBO | null) => void): void {
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  programs.display.bind();
  if (config.SHADING) {
    gl.uniform2f(programs.display.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
  }
  gl.uniform1i(programs.display.uniforms.uTexture, buffers.dye.read.attach(0));
  blit(null);
}
