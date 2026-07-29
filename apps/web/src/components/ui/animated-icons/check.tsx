"use client";

/**
 * Animated check. Vendored from pqoqubbw/icons — https://lucide-animated.com,
 * https://github.com/pqoqubbw/icons — which ships as a shadcn registry rather
 * than an npm package, so the source lives here.
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

const PATH_VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    scale: [0.5, 1],
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
};

export function CheckIcon({
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
        <motion.path
          animate={controls}
          d="M4 12 9 17L20 6"
          initial="normal"
          variants={PATH_VARIANTS}
        />
      </svg>
    </span>
  );
}
