"use client";

import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const SAMPLES = 200;
const CENTER = 55;
const BAND = 0.09;
// Overshoot the [0, 1] scroll range by one band width on each side so the
// transition's soft midpoint (tangle = 0.5) never lands exactly on the
// visible top-of-page or bottom-of-page sample — otherwise those samples
// stay a fixed 50% tangled no matter how far you've scrolled.
const START_PROGRESS = -BAND;
const END_PROGRESS = 1 + BAND;

const THREAD_COLOR = "#cfc8be";

// Deterministic "tangle" shape: a handful of non-integer-ratio sine
// harmonics that never line up into a clean repeating wave, so the thread
// reads as a genuinely knotted cord rather than a smooth oscillation.
// Amplitudes and CENTER are percentages of the container width.
const HARMONICS = [
  { freq: 1.7, amp: 16, phase: 0.4 },
  { freq: 3.4, amp: 10, phase: 2.7 },
  { freq: 5.9, amp: 6, phase: 1.1 },
  { freq: 9.3, amp: 3, phase: 4.2 },
];

const REPEAT_UNIT = "dhaga  ·  ";
// Text past the referenced path's length is simply not rendered, so we can
// generously over-provision repeats without measuring the actual path length.
const TRADEMARK_TEXT = REPEAT_UNIT.repeat(400);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * The thread is a fixed tangle shape with a straightening front that sweeps
 * down the page as `progress` (tied to overall scroll) advances: points
 * below the front (not yet reached) stay fully knotted, points above it
 * (already scrolled past) are pulled flat, with a soft blend at the front
 * itself — like pulling a snagged cord taut hand over hand as you read
 * further down the page. Coordinates are real container pixels (not an
 * abstract viewBox) so the "dhaga" text riding the path via <textPath>
 * renders undistorted instead of being squashed by a non-uniform scale.
 */
function buildPath(progress: number, width: number, height: number): string {
  let d = "";
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const y = t * height;

    const tangle = smoothstep(progress - BAND, progress + BAND, t);
    const offsetPercent = HARMONICS.reduce(
      (sum, h) => sum + h.amp * Math.sin(2 * Math.PI * h.freq * t + h.phase),
      0,
    );

    const x = (CENTER / 100) * width + (tangle * offsetPercent * width) / 100;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/**
 * A single thread running the full height of the page, with "dhaga" set in
 * small, faint type riding along it: tangled and chaotic ahead of the
 * reader, pulled taut behind them as they scroll. Rendered in normal
 * document flow (absolute within `<main>`, not viewport-fixed) so it
 * travels with the page instead of staying pinned to one spot, and sits
 * behind section content in DOM order so it never competes with text.
 * Static and fully straight under reduced motion.
 */
export function StraightenThread() {
  const pathId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!container || !svg || !path) return;

    const dims = { width: 0, height: 0 };
    const state = { progress: START_PROGRESS };

    function redraw() {
      if (!svg || !path || !dims.width || !dims.height) return;
      svg.setAttribute("viewBox", `0 0 ${dims.width} ${dims.height}`);
      path.setAttribute("d", buildPath(state.progress, dims.width, dims.height));
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      dims.width = entry.contentRect.width;
      dims.height = entry.contentRect.height;
      redraw();
    });
    resizeObserver.observe(container);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      state.progress = START_PROGRESS;
      gsap.to(state, {
        progress: END_PROGRESS,
        ease: "none",
        onUpdate: redraw,
        scrollTrigger: { start: 0, end: "max", scrub: true },
      });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      state.progress = END_PROGRESS;
      redraw();
    });

    return () => {
      resizeObserver.disconnect();
      mm.revert();
    };
  });

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden md:block"
    >
      <svg ref={svgRef} className="h-full w-full">
        <path
          ref={pathRef}
          id={pathId}
          fill="none"
          stroke={THREAD_COLOR}
          strokeOpacity="0.40"
          strokeWidth="20"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(226,164,76,0.5))" }}
        />
        <text
          className="font-mono"
          fill="#0d0b09"
          fillOpacity="0.4"
          fontSize="14"
          letterSpacing="1"
          dominantBaseline="central"
        >
          <textPath href={`#${pathId}`}>{TRADEMARK_TEXT}</textPath>
        </text>
      </svg>
    </div>
  );
}
