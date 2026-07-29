"use client";

import { useEffect, type RefObject } from "react";
import { Camera, Geometry, Mesh, Program, Renderer } from "ogl";
import { startAnimationLoop } from "./animate";
import { resolveParticleColor } from "./colors";
import { generateParticleBuffers } from "./generate-buffers";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export interface ParticleSceneOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  mouseRef: RefObject<{ x: number; y: number }>;
  particleCount: number;
  particleSpread: number;
  speed: number;
  particleColors: string[];
  moveParticlesOnHover: boolean;
  particleHoverFactor: number;
  alphaParticles: boolean;
  particleBaseSize: number;
  sizeRandomness: number;
  cameraDistance: number;
  disableRotation: boolean;
  pixelRatio: number;
  /** Included in the effect's deps so a light/dark toggle regenerates particles
   *  with freshly-resolved brand colors; the value itself isn't read here —
   *  `resolveParticleColor` reads the live CSS custom properties off the
   *  container instead. */
  themeKey: string | undefined;
}

/** Mounts the ogl WebGL particle scene into `containerRef` and fully tears it
 *  down on cleanup/re-run (resize/hover listeners, RAF loop, canvas element).
 *  Skips entirely under prefers-reduced-motion. */
export function useParticleScene({
  containerRef,
  mouseRef,
  particleCount,
  particleSpread,
  speed,
  particleColors,
  moveParticlesOnHover,
  particleHoverFactor,
  alphaParticles,
  particleBaseSize,
  sizeRandomness,
  cameraDistance,
  disableRotation,
  pixelRatio,
  themeKey,
}: ParticleSceneOptions): void {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ dpr: pixelRatio, depth: false, alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener("resize", resize, false);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      };
    };
    if (moveParticlesOnHover) container.addEventListener("mousemove", handleMouseMove);

    const resolvedColors = particleColors.map((color) => resolveParticleColor(color, container));
    const { positions, randoms, colors } = generateParticleBuffers(particleCount, resolvedColors);

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });

    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    const animation = startAnimationLoop({
      renderer,
      camera,
      particles,
      program,
      mouseRef,
      speed,
      moveParticlesOnHover,
      particleHoverFactor,
      disableRotation,
    });

    return () => {
      window.removeEventListener("resize", resize);
      if (moveParticlesOnHover) container.removeEventListener("mousemove", handleMouseMove);
      animation.cancel();
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
    themeKey,
  ]);
}
