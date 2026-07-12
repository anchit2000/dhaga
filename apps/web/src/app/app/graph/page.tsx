import { requireUserIdForPage } from "@/lib/auth/guard";
import { fetchGraphClusters } from "@/lib/repo/graph-data";
import { EmptyState } from "@/components/app/EmptyState";
import { GraphBrowser } from "@/components/app/graph/GraphBrowser";
import { WarmPathPanel } from "@/components/app/graph/WarmPathPanel";

export const metadata = { title: "Graph — Dhaga" };

export default async function GraphPage() {
  await requireUserIdForPage();
  const clusters = await fetchGraphClusters("company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Graph</h1>
        <p className="mt-1 text-sm text-fog">
          Your whole network, by company, tag, or location — click a cluster to
          see who's in it, click a person to open them.
        </p>
      </div>
      {clusters.length === 0 ? (
        <EmptyState
          title="Nothing to draw yet"
          body="Add people and notes — companies and relationships appear here as they're extracted."
        />
      ) : (
        <>
          <WarmPathPanel />
          <GraphBrowser initialClusters={clusters} />
        </>
      )}
    </div>
  );
}
