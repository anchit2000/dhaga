"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { HERO_SUBLINES } from "@/utils/constants/landing";

const ROTATE_MS = 4500;

/**
 * A crossfading carousel of {@link HERO_SUBLINES}, rendered as a smaller line
 * beneath the static hero headline.
 *
 * All lines render into one stacked grid cell so the element sizes to the
 * tallest line (no layout shift as they cycle). Only the active line is visible
 * and exposed to assistive tech; the rest stay in the DOM (crawlable, but
 * `aria-hidden`). Under `prefers-reduced-motion` the rotation never starts, so
 * the first line stays put.
 */
export function HeroSubline({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): React.JSX.Element {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SUBLINES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <p className={className} style={style}>
      <span className="grid">
        {HERO_SUBLINES.map((line, i) => (
          <span
            key={line.accent}
            aria-hidden={i === active ? undefined : true}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ease-out ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          >
            {line.pre}
            <em className="text-ember italic">{line.accent}</em>
            {line.post}
          </span>
        ))}
      </span>
    </p>
  );
}
