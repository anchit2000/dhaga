"use client";

import { Layers3, LoaderCircle, Route } from "lucide-react";
import { GraphStage as SigmaGraphStage } from "@/components/landing/NetworkSandbox/LandingGraph/GraphStage";
import { FEATURE_GRAPH_WARM_PATH, type GraphScene } from "@/utils/constants/landing/graph";
import { useFeatureGraph } from "./useFeatureGraph";

function WarmPathCard(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-[17rem] rounded-xl border border-seam bg-panel/95 p-3 shadow-lg backdrop-blur">
      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fog">
        <Route className="size-3 text-ember" aria-hidden /> Warm path to
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded-md border border-line bg-well px-2 py-1 text-[10px] text-paper">
          {FEATURE_GRAPH_WARM_PATH.target}
        </span>
        <span className="rounded-full bg-amber px-2 py-1 text-[9px] font-semibold text-on-accent">
          Find path
        </span>
      </div>
      <p className="mt-2 text-[10px] font-medium text-paper">
        {FEATURE_GRAPH_WARM_PATH.labels.join(" → ")}
      </p>
      <p className="mt-1 text-right text-[9px] text-ember">Show on graph →</p>
    </div>
  );
}

function LayersChip({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <div className={`pointer-events-none absolute left-3 top-3 z-30 items-center gap-1.5 rounded-full border border-seam bg-panel/95 px-2.5 py-1.5 text-[10px] text-paper shadow-lg backdrop-blur ${compact ? "hidden sm:flex" : "flex"}`}>
      <Layers3 className="size-3" aria-hidden /> Layers
    </div>
  );
}

export function GraphStage({
  scene,
  compact = false,
}: {
  scene: GraphScene;
  compact?: boolean;
}): React.ReactElement {
  const { dataset, error } = useFeatureGraph();
  const isWarmPath = scene.id === "warmpath";

  if (!dataset) {
    return (
      <div className="flex h-full items-center justify-center bg-ink text-sm text-ink-muted">
        {error ? (
          <span>Graph preview unavailable</span>
        ) : (
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading your network…
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-ink">
      <SigmaGraphStage
        payload={dataset.payload}
        indexes={dataset.indexes}
        positions={dataset.positions}
        explodable={false}
        exploding={false}
        onExplode={() => {}}
        highlightedPath={isWarmPath || compact ? FEATURE_GRAPH_WARM_PATH.ids : null}
        autoCircleCount={0}
        compactChrome={compact}
      />
      {isWarmPath ? <WarmPathCard /> : <LayersChip compact={compact} />}
    </div>
  );
}
