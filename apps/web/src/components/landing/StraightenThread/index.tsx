"use client";

import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { buildPath, START_PROGRESS, END_PROGRESS } from "./geometry";

const THREAD_COLOR = "var(--brand-fog)";

const REPEAT_UNIT = "dhaga  ·  ";

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
  const glowRef = useRef<SVGPathElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);

  useGSAP(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const glow = glowRef.current;
    const textPath = textPathRef.current;
    if (!container || !svg || !path || !glow || !textPath) return;

    const dims = { width: 0, height: 0 };
    const state = { progress: START_PROGRESS };

    function redraw() {
      if (!svg || !path || !glow || !dims.width || !dims.height) return;
      svg.setAttribute("viewBox", `0 0 ${dims.width} ${dims.height}`);
      const d = buildPath(state.progress, dims.width, dims.height);
      path.setAttribute("d", d);
      glow.setAttribute("d", d);
    }

    // The over-provisioned 4,000-glyph label used to be re-laid-out along the
    // path on every scroll frame; fitting it to the measured path length once
    // keeps per-frame text layout to what actually renders.
    function sizeText() {
      if (!path || !textPath || !dims.width || !dims.height) return;
      textPath.textContent = REPEAT_UNIT;
      const unit = textPath.getComputedTextLength();
      // The fully-tangled state (START_PROGRESS) makes the longest path; fit
      // the label to that so straightening never runs the text short.
      path.setAttribute("d", buildPath(START_PROGRESS, dims.width, dims.height));
      const maxLen = path.getTotalLength();
      redraw();
      // 1.15 headroom absorbs webfont metric drift: measurement may happen
      // before the mono webfont loads, nudging one unit's advance.
      const repeats = unit === 0 ? 400 : Math.min(400, Math.ceil((maxLen * 1.15) / unit));
      textPath.textContent = REPEAT_UNIT.repeat(repeats);
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      dims.width = entry.contentRect.width;
      dims.height = entry.contentRect.height;
      redraw();
      sizeText();
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
        {/* The amber halo used to be a CSS drop-shadow filter whose
            full-page-height filter region re-rasterized on every scroll
            frame; a wide translucent underlay stroke reads the same and
            costs one extra path paint. */}
        <path
          ref={glowRef}
          fill="none"
          stroke="#e2a44c"
          strokeOpacity="0.14"
          strokeWidth="32"
          strokeLinecap="round"
        />
        <path
          ref={pathRef}
          id={pathId}
          fill="none"
          stroke={THREAD_COLOR}
          strokeOpacity="0.40"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <text
          className="font-mono"
          fill="#0d0b09"
          fillOpacity="0.4"
          fontSize="14"
          letterSpacing="1"
          dominantBaseline="central"
        >
          <textPath ref={textPathRef} href={`#${pathId}`} />
        </text>
      </svg>
    </div>
  );
}
