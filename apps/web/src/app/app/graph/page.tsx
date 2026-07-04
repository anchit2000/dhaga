import { requireUserIdForPage } from "@/lib/auth/guard";
import { fetchGraphView } from "@/lib/repo/graph-data";
import { EmptyState } from "@/components/app/EmptyState";
import { GraphBrowser } from "@/components/app/graph/GraphBrowser";
import {
  WarmPathPanel,
  type WarmPathTarget,
} from "@/components/app/graph/WarmPathPanel";

export const metadata = { title: "Graph — Dhaga" };

export default async function GraphPage() {
  await requireUserIdForPage();
  const data = await fetchGraphView();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Graph</h1>
        <p className="mt-1 text-sm text-fog">
          Your whole network — people, companies, and how they connect. Drag to
          rearrange, click a person to open them.
        </p>
      </div>
      {data.nodes.length === 0 ? (
        <EmptyState
          title="Nothing to draw yet"
          body="Add people and notes — companies and relationships appear here as they're extracted."
        />
      ) : (
        <>
          <WarmPathPanel
            targets={data.nodes.map(
              (node): WarmPathTarget => ({
                id: node.id,
                label: node.label,
                kind: node.kind,
              }),
            )}
          />
          <GraphBrowser data={data} />
        </>
      )}
    </div>
  );
}
