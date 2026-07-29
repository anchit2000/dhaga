import type { Camera, Mesh, Program, Renderer } from "ogl";
import type { RefObject } from "react";

export interface AnimationLoopOptions {
  renderer: Renderer;
  camera: Camera;
  particles: Mesh;
  program: Program;
  mouseRef: RefObject<{ x: number; y: number }>;
  speed: number;
  moveParticlesOnHover: boolean;
  particleHoverFactor: number;
  disableRotation: boolean;
}

/** Starts the per-frame RAF loop (hover offset, slow rotation, render) and
 *  returns a handle to cancel it. */
export function startAnimationLoop(options: AnimationLoopOptions): { cancel: () => void } {
  const {
    renderer,
    camera,
    particles,
    program,
    mouseRef,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    disableRotation,
  } = options;

  let animationFrameId = 0;
  let lastTime = performance.now();
  let elapsed = 0;

  const update = (t: number) => {
    animationFrameId = requestAnimationFrame(update);
    elapsed += (t - lastTime) * speed;
    lastTime = t;

    program.uniforms.uTime.value = elapsed * 0.001;

    if (moveParticlesOnHover) {
      particles.position.x = -mouseRef.current.x * particleHoverFactor;
      particles.position.y = -mouseRef.current.y * particleHoverFactor;
    } else {
      particles.position.x = 0;
      particles.position.y = 0;
    }

    if (!disableRotation) {
      particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
      particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
      particles.rotation.z += 0.01 * speed;
    }

    renderer.render({ scene: particles, camera });
  };
  animationFrameId = requestAnimationFrame(update);

  return { cancel: () => cancelAnimationFrame(animationFrameId) };
}
