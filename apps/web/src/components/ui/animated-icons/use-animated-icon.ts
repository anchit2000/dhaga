"use client";

import { useCallback, useImperativeHandle, useRef } from "react";
import { useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes, MouseEvent, Ref } from "react";

/**
 * Shared wiring for the vendored animated icons in this directory (see any of
 * them for the pqoqubbw/icons attribution). Kept in one place so the
 * prefers-reduced-motion guard — which the upstream library does not ship — has
 * a single implementation rather than three copies to keep in sync.
 */

/** Lets a parent drive the animation (usually the button wrapping the icon, so
 *  the whole 44px target triggers it, not just the 12–16px glyph). */
export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface AnimatedIconProps extends HTMLAttributes<HTMLSpanElement> {
  /** svg width/height in px, matching lucide-react's `size`. Inside `<Button>`
   *  the button's `[&_svg]:size-*` rule wins, exactly as it does for lucide. */
  size?: number;
  ref?: Ref<AnimatedIconHandle>;
}

interface AnimatedIconOptions {
  ref?: Ref<AnimatedIconHandle>;
  onMouseEnter?: (event: MouseEvent<HTMLSpanElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLSpanElement>) => void;
}

interface AnimatedIconBindings {
  controls: ReturnType<typeof useAnimation>;
  handleMouseEnter: (event: MouseEvent<HTMLSpanElement>) => void;
  handleMouseLeave: (event: MouseEvent<HTMLSpanElement>) => void;
}

export function useAnimatedIcon({
  ref,
  onMouseEnter,
  onMouseLeave,
}: AnimatedIconOptions): AnimatedIconBindings {
  const controls = useAnimation();
  // True once a parent has taken the handle, in which case hovering the icon
  // itself forwards the event instead of self-animating (upstream's behaviour —
  // React only calls the useImperativeHandle initialiser when `ref` is set).
  const isControlledRef = useRef(false);
  // motion's own reduced-motion primitive rather than the landing components'
  // matchMedia-in-effect idiom: those guard imperative canvas loops, whereas
  // this rides the animation library we already depend on. It is read ONLY to
  // skip the trigger, never to change what's rendered — so the null it returns
  // during SSR can't cause a hydration mismatch, and the icons stay in their
  // `normal` variant (fully drawn, opacity 1) exactly as they render today.
  const shouldReduceMotion = useReducedMotion() === true;

  const play = useCallback(
    (variant: "animate" | "normal") => {
      if (shouldReduceMotion) return;
      void controls.start(variant);
    },
    [controls, shouldReduceMotion],
  );

  useImperativeHandle(
    ref,
    () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => play("animate"),
        stopAnimation: () => play("normal"),
      };
    },
    [play],
  );

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) onMouseEnter?.(event);
      else play("animate");
    },
    [onMouseEnter, play],
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) onMouseLeave?.(event);
      else play("normal");
    },
    [onMouseLeave, play],
  );

  return { controls, handleMouseEnter, handleMouseLeave };
}
