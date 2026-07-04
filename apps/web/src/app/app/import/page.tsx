import { requireUserIdForPage } from "@/lib/auth/guard";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { ImportPanel } from "@/components/app/import/ImportPanel";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";

export const metadata = { title: "Import — Dhaga" };

export default async function ImportPage() {
  await requireUserIdForPage();
  const clusters = await getSuggestedClusters();

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Import</h1>
          <p className="mt-1 max-w-2xl text-sm text-fog">
            Seed your graph from a Google Contacts export or your LinkedIn
            Connections file (LinkedIn: Settings → Data privacy → Get a copy of
            your data). Re-importing a newer file is safe — people already in
            your graph are skipped.
          </p>
        </div>
        <ImportPanel />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg tracking-tight">Suggested groups</h2>
          <p className="mt-1 max-w-2xl text-sm text-fog">
            Patterns noticed in your saved names — a shared surname can be a
            community, a word like “JOGET” is often a company. Nothing is
            applied until you confirm it.
          </p>
        </div>
        <SuggestionsPanel clusters={clusters} />
      </div>
    </div>
  );
}
