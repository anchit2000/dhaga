import Link from "next/link";
import { after } from "next/server";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { hybridSearch } from "@/lib/repo/search";
import { countUnindexed, ensureIndexed } from "@/lib/repo/embeddings";
import { embeddingsEnabled } from "@/lib/ai/embedder";
import { AskAi } from "@/components/app/search/AskAi";
import { SearchInput } from "@/components/app/search/SearchInput";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Search — Dhaga" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUserIdForPage();
  const { q } = await searchParams;
  const [hits, unindexed] = await Promise.all([
    q?.trim() ? hybridSearch(q) : Promise.resolve([]),
    embeddingsEnabled() ? countUnindexed() : Promise.resolve(0),
  ]);
  // Backfill runs after the response is sent — never blocks the page.
  if (unindexed > 0) after(() => ensureIndexed());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-fog">
          Ask your network — matches come from names, facts, notes, and local
          semantic similarity.
        </p>
      </div>

      {unindexed > 0 ? (
        <p className="text-xs text-fog" role="status">
          Indexing {unindexed} item{unindexed === 1 ? "" : "s"} in the
          background — semantic matches improve in a moment. Everything runs
          on this machine.
        </p>
      ) : null}

      <SearchInput defaultValue={q ?? ""} />

      {q?.trim() ? (
        hits.length === 0 ? (
          <EmptyState
            title="No matches"
            body="None of your people, facts, or notes contain those words yet."
          />
        ) : (
          <>
            <AskAi query={q} />
            <ul className="space-y-2">
              {hits.map((hit) => (
                <li key={hit.contactId}>
                  <Link
                    href={`/app/people/${hit.contactId}`}
                    className="block rounded-xl border border-seam bg-panel p-4 transition-colors hover:bg-paper/[0.03]"
                  >
                    <p className="text-sm font-medium text-paper">
                      {hit.name}
                      <span className="font-normal text-fog">
                        {[hit.title, hit.companyName].filter(Boolean).length > 0
                          ? ` · ${[hit.title, hit.companyName].filter(Boolean).join(" · ")}`
                          : ""}
                      </span>
                    </p>
                    {hit.matches.length > 0 ? (
                      <ul className="mt-1.5 space-y-0.5">
                        {hit.matches.map((match) => (
                          <li
                            key={match}
                            className="truncate border-l-2 border-amber/60 pl-2 text-xs italic text-fog"
                          >
                            {match}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </div>
  );
}
