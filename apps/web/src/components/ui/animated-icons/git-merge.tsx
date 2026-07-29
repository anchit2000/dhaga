"use client";

/**
 * Animated git-merge. Vendored from pqoqubbw/icons —
 * https://lucide-animated.com, https://github.com/pqoqubbw/icons — which ships
 * as a shadcn registry rather than an npm package, so the source lives here.
 *
 * MIT License. Copyright (c) 2024-2026 pqoqubbw.
 *
 * Local changes: React 19 ref-as-prop instead of forwardRef (this repo has no
 * forwardRef anywhere), a <span> wrapper instead of <div> (a div is invalid
 * inside the <button>s we drop these into), lucide's default size/aria-hidden
 * so it swaps in without layout shift, and the prefers-reduced-motion guard the
 * upstream library does not ship — see ./use-animated-icon.
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "./use-animated-icon";
import type { Variants } from "motion/react";
import type { AnimatedIconProps } from "./use-animated-icon";

const DURATION = 0.3;

/** Staggers the three strokes so the merge draws bottom node → arc → top node. */
function delayFor(index: number): number {
  if (index === 0) return 0.1;
  return index * DURATION + 0.1;
}

const STROKE_VARIANTS: Variants = {
  normal: { pathLength: 1, opacity: 1, transition: { delay: 0 } },
  animate: { pathLength: [0, 1], opacity: [0, 1] },
};

const ARC_VARIANTS: Variants = {
  normal: { pathLength: 1, pathOffset: 0, opacity: 1, transition: { delay: 0 } },
  animate: { pathLength: [0, 1], opacity: [0, 1], pathOffset: [1, 0] },
};

export function GitMergeIcon({
  ref,
  className,
  size = 24,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AnimatedIconProps): React.ReactElement {
  const { controls, handleMouseEnter, handleMouseLeave } = useAnimatedIcon({
    ref,
    onMouseEnter,
    onMouseLeave,
  });

  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      aria-hidden="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.circle
          animate={controls}
          cx="18"
          cy="18"
          r="3"
          initial="normal"
          transition={{
            duration: DURATION,
            delay: delayFor(0),
            opacity: { delay: delayFor(0) },
          }}
          variants={STROKE_VARIANTS}
        />
        <motion.circle
          animate={controls}
          cx="6"
          cy="6"
          r="3"
          initial="normal"
          transition={{
            duration: DURATION,
            delay: delayFor(2),
            opacity: { delay: delayFor(2) },
          }}
          variants={STROKE_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M6 21V9a9 9 0 0 0 9 9"
          initial="normal"
          transition={{
            duration: DURATION,
            delay: delayFor(1),
            opacity: { delay: delayFor(1) },
          }}
          variants={ARC_VARIANTS}
        />
      </svg>
    </span>
  );
}
