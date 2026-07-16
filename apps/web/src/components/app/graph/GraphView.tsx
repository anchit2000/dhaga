"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/app/EmptyState";
import { LoadingState } from "./LoadingState";
import { useGraphData } from "./use-graph-data";
import { WarmPathPanel } from "./WarmPathPanel";
import type { PathRequest } from "./canvas/use-deep-link";

// Sigma touches window/WebGL at construction — client-only chunk.
const GraphCanvas = dynamic(() => import("./canvas/GraphCanvas").then((m) => m.GraphCanvas), {
  ssr: false,
  loading: () => <LoadingState label="Preparing canvas" progress={null} />,
});

/** Renders the graph payload (cached-first boot + layout live in
 *  useGraphData; this component only maps phases to UI). */
export function GraphView({
  focusId,
  viewerId,
}: {
  focusId: string | null;
  /** Authenticated account id — scopes the client-side payload caches. */
  viewerId: string;
}): React.ReactElement {
  const { phase, refetch } = useGraphData(viewerId);
  const [pathRequest, setPathRequest] = useState<PathRequest | null>(null);

  const showPath = useCallback((ids: readonly string[]) => {
    setPathRequest((prev) => ({ ids, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  if (phase.stage === "empty") {
    return (
      <EmptyState
        title="Nothing to draw yet"
        body="Add people and notes — companies and relationships appear here as they're extracted."
      />
    );
  }
  if (phase.stage === "error") {
    return <EmptyState title="The graph couldn't load" body={phase.message} />;
  }

  return (
    <div className="space-y-4">
      <WarmPathPanel onShowPath={showPath} />
      {phase.stage === "fetching" ? (
        <LoadingState label="Loading your graph" progress={null} />
      ) : phase.stage === "layout" ? (
        <LoadingState label="Mapping the threads" progress={phase.progress} />
      ) : (
        <GraphCanvas
          payload={phase.payload}
          indexes={phase.indexes}
          positions={phase.positions}
          focusId={focusId}
          pathRequest={pathRequest}
          onGraphChanged={refetch}
        />
      )}
    </div>
  );
}
