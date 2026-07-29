import { hexToRgb } from "./utils";

export interface ParticleBuffers {
  positions: Float32Array;
  randoms: Float32Array;
  colors: Float32Array;
}

/** Generates per-particle position/random/color attribute buffers. Positions
 *  are uniformly distributed inside the unit sphere (rejection sampling +
 *  cube-root radius); colors are picked uniformly from `resolvedColors`. */
export function generateParticleBuffers(
  particleCount: number,
  resolvedColors: string[],
): ParticleBuffers {
  const positions = new Float32Array(particleCount * 3);
  const randoms = new Float32Array(particleCount * 4);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let len = 0;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      len = x * x + y * y + z * z;
    } while (len > 1 || len === 0);
    const r = Math.cbrt(Math.random());
    positions.set([x * r, y * r, z * r], i * 3);
    randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    colors.set(hexToRgb(resolvedColors[Math.floor(Math.random() * resolvedColors.length)]), i * 3);
  }

  return { positions, randoms, colors };
}
