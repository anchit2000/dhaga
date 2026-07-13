import { requireUserIdForPage } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { fetchGraphClusters, UNASSIGNED_KEY } from "@/lib/repo/graph-data";
import { EmptyState } from "@/components/app/EmptyState";
import { GraphBrowser } from "@/components/app/graph/GraphBrowser";
import { WarmPathPanel } from "@/components/app/graph/WarmPathPanel";

export const metadata = { title: "Graph — Dhaga" };

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserIdForPage();
  const { focus } = await searchParams;
  const clusters = await fetchGraphClusters("company");

  let focusTarget: { contactId: string; clusterKey: string } | null = null;
  let focusMissing = false;
  if (focus) {
    const detail = await getContact(focus);
    if (detail) {
      focusTarget = { contactId: focus, clusterKey: detail.contact.companyId ?? UNASSIGNED_KEY };
    } else {
      focusMissing = true;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Graph</h1>
        <p className="mt-1 text-sm text-fog">
          Navigate by company, tag, or location — select a cluster to move there
          and reveal its neighbourhood.
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
          <GraphBrowser
            initialClusters={clusters}
            focusTarget={focusTarget}
            focusMissing={focusMissing}
          />
        </>
      )}
    </div>
  );
}
