import Link from "next/link";
import type { ReactElement } from "react";

import { ArrowRight } from "lucide-react";

import { GRAPH_PROOF } from "@/utils/constants/landing";
import { CompactGraph } from "./CompactGraph";

export function GraphProof(): ReactElement {
  return (
    <section id="living-graph" className="border-b border-seam bg-panel/25">
      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-6 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12 lg:py-16">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-magic">
            {GRAPH_PROOF.eyebrow}
          </p>
          <h2 className="mt-4 text-balance font-display text-4xl leading-tight">
            {GRAPH_PROOF.heading}
          </h2>
          <p className="mt-4 text-pretty leading-7 text-fog">{GRAPH_PROOF.body}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Graph capabilities">
            {GRAPH_PROOF.capabilities.map((capability) => (
              <li
                key={capability}
                className="rounded-full border border-seam bg-panel px-3 py-1.5 text-xs text-paper"
              >
                {capability}
              </li>
            ))}
          </ul>
          <Link
            href="/features"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-trust transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
          >
            {GRAPH_PROOF.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div>
          <CompactGraph />
          <p className="mt-2 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-fog">
            {GRAPH_PROOF.proof}
          </p>
        </div>
      </div>
    </section>
  );
}
