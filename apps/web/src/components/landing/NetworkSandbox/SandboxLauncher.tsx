"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SANDBOX_CORE_NODE_LABEL,
  SANDBOX_LAUNCH_CTA,
  SANDBOX_TEASER_NOTE,
} from "@/utils/constants/landing";

// The sigma widget (WebGL, ~hundreds of KB) and its JSON asset are code-split
// behind this dynamic import: the chunk is fetched only when <LandingGraph/>
// first renders — i.e. after the visitor clicks. ssr:false because sigma
// touches window/WebGL at construction.
const LandingGraph = dynamic(() => import("./LandingGraph").then((m) => m.LandingGraph), {
  ssr: false,
  loading: () => <LauncherShell pending />,
});

/** Static, screenshot-worthy teaser + launch CTA. Renders nothing graph-related
 *  until `launched`, keeping the landing's first paint featherweight. */
export function SandboxLauncher(): React.ReactElement {
  const [launched, setLaunched] = useState(false);

  if (launched) return <LandingGraph />;

  return (
    <LauncherShell>
      <Button size="lg" className="gap-2" onClick={() => setLaunched(true)}>
        <Play className="size-4" aria-hidden />
        {SANDBOX_LAUNCH_CTA}
      </Button>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-fog">
        {SANDBOX_CORE_NODE_LABEL} · {SANDBOX_TEASER_NOTE}
      </p>
    </LauncherShell>
  );
}

/**
 * The framed teaser box: a faint static constellation behind a centred slot.
 * Shared by the idle state (holds the CTA), the dynamic-import loading state
 * (`pending`), and keeps the exact geometry of the live widget's container so
 * mounting the graph doesn't shift the layout.
 */
function LauncherShell({
  children,
  pending = false,
}: {
  children?: React.ReactNode;
  pending?: boolean;
}): React.ReactElement {
  return (
    <div className="relative flex h-[70vh] min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-seam bg-ink">
      <TeaserConstellation />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--brand-ink)_100%)]" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {pending ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-fog">Loading the network…</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/** A dozen amber nodes on faint seam threads — pure static SVG, no layout cost. */
function TeaserConstellation(): React.ReactElement {
  const nodes = [
    { x: 20, y: 30, r: 2.4 },
    { x: 34, y: 62, r: 1.8 },
    { x: 48, y: 24, r: 3.2 },
    { x: 50, y: 50, r: 4.2 },
    { x: 63, y: 70, r: 2.2 },
    { x: 72, y: 34, r: 3 },
    { x: 82, y: 58, r: 1.9 },
    { x: 28, y: 46, r: 1.6 },
    { x: 58, y: 38, r: 2 },
    { x: 40, y: 78, r: 1.7 },
    { x: 88, y: 40, r: 1.5 },
    { x: 14, y: 66, r: 1.6 },
  ];
  const links: [number, number][] = [
    [3, 2],
    [3, 4],
    [3, 8],
    [3, 0],
    [3, 1],
    [8, 5],
    [5, 6],
    [4, 6],
    [0, 7],
    [7, 1],
    [1, 9],
    [5, 10],
    [7, 11],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-40"
    >
      <g stroke="var(--brand-seam)" strokeWidth="0.3">
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
        ))}
      </g>
      <g fill="var(--brand-amber)">
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} />
        ))}
      </g>
    </svg>
  );
}
