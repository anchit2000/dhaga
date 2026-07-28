"use client";

import { Loader2 } from "lucide-react";
import { SANDBOX_WATERMARK } from "@/utils/constants/landing";
import { GraphStage } from "./GraphStage";
import { useLandingGraph } from "./useLandingGraph";

/**
 * Decoupled sigma widget mounted only after the visitor clicks the launcher.
 * Owns the two on-demand assets (useLandingGraph); the renderer itself lives in
 * GraphStage, remounted via a `key` change when the mode flips core → full so a
 * fresh sigma is built for the 21k set instead of mutating the live one.
 */
export function LandingGraph(): React.ReactElement {
  const { mode, dataset, error, explodable, exploding, explode } = useLandingGraph();

  return (
    <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-seam bg-ink">
      {dataset ? (
        <GraphStage
          key={mode}
          payload={dataset.payload}
          indexes={dataset.indexes}
          positions={dataset.positions}
          explodable={explodable}
          exploding={exploding}
          onExplode={explode}
        />
      ) : (
        <StatusOverlay error={error} />
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-30 select-none font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
        {SANDBOX_WATERMARK}
      </div>
    </div>
  );
}

/** Shown while the core asset loads, or if it fails. */
function StatusOverlay({ error }: { error: string | null }): React.ReactElement {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center">
      {error ? (
        <p className="max-w-sm text-sm text-fog">{error}</p>
      ) : (
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-fog">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Mapping the threads…
        </p>
      )}
    </div>
  );
}
