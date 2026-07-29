"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { useParticleScene } from "./use-particle-scene";

export interface ParticlesProps {
  /** Hex literals (`#e2a44c`) or `--brand-*` custom-property names, resolved
   *  live so particles follow the light/dark toggle. */
  particleColors?: string[];
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  alphaParticles?: boolean;
  disableRotation?: boolean;
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  pixelRatio?: number;
  className?: string;
}

/**
 * Ambient WebGL particle field (via ogl), ported from React Bits' Particles
 * with brand colors baked in as defaults. Skips entirely under
 * prefers-reduced-motion, matching SplashCursor's guard.
 */
export function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ["#e2a44c"],
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = true,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className,
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { resolvedTheme } = useTheme();

  useParticleScene({
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
    themeKey: resolvedTheme,
  });

  return <div ref={containerRef} aria-hidden="true" className={`h-full w-full ${className ?? ""}`} />;
}
