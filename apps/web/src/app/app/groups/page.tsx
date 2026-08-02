import { EmptyState } from "@/components/app/EmptyState";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getSuggestedClusters } from "@/lib/repo/suggestions";

export const metadata = { title: "Groups — Dhaga" };

export default async function GroupsPage() {
  await requireUserIdForPage();
  const clusters = await getSuggestedClusters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Groups</h1>
        <p className="mt-1 text-sm text-fog">
          Words shared across several saved names — a surname, a company, or a place written into the name.
        </p>
      </div>

      {clusters.length === 0 ? (
        <EmptyState title="No groups to suggest" body="They appear here when several saved names share a word — a surname, a company, or a place." />
      ) : (
        <SuggestionsPanel clusters={clusters} />
      )}
    </div>
  );
}
