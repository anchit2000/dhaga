"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const SAMPLES = 200;

/**
 * Models the thread as the first two vibrational modes of a plucked
 * string: sine waves whose amplitude decays exponentially away from the
 * loose (top) end, the higher mode damping out faster — the same math
 * that describes a real string settling after being flicked. `settle`
 * (0 to 1, tied to overall page scroll) scales the whole oscillation down
 * to nothing, as if each bit of scrolling pulls the thread a little more
 * taut, until it's a straight line by the bottom.
 */
function buildPath(settle: number): string {
  const loose = 1 - settle;
  let d = "";
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const y = t * 100;

    const mode1 = 20 * Math.exp(-2.0 * t) * Math.sin(2 * Math.PI * 1.3 * t + 0.6);
    const mode2 = 9 * Math.exp(-5.5 * t) * Math.sin(2 * Math.PI * 3.7 * t + 2.1);

    const x = 55 + loose * (mode1 + mode2);
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/**
 * A single amber thread running the full height of the page: loose and
 * wavy near the top, pulled into a calm, nearly-straight line by the
 * footer, tied to overall scroll progress. Rendered in normal document
 * flow (absolute within `<main>`, not viewport-fixed) so it travels with
 * the page instead of staying pinned to one spot, and sits behind section
 * content in DOM order so it never competes with text. Static and settled
 * under reduced motion.
 */
export function StraightenThread() {
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(() => {
    const path = pathRef.current;
    if (!path) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const state = { settle: 0 };
      gsap.to(state, {
        settle: 1,
        ease: "none",
        onUpdate: () => path.setAttribute("d", buildPath(state.settle)),
        scrollTrigger: { start: 0, end: "max", scrub: true },
      });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      path.setAttribute("d", buildPath(1));
    });
    return () => mm.revert();
  });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <path
          ref={pathRef}
          d={buildPath(0)}
          fill="none"
          stroke="#e2a44c"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0 0 4px rgba(226,164,76,0.5))" }}
        />
      </svg>
    </div>
  );
}
