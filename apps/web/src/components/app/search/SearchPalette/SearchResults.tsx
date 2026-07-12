import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import type { SearchState } from "@/lib/actions/search";

/** The instant/free tab's results: local keyword + semantic matches. */
export function SearchResults({
  state,
  query,
  pending,
  onNavigate,
}: {
  state: SearchState;
  query: string;
  pending: boolean;
  onNavigate: () => void;
}) {
  if (!query.trim()) {
    return (
      <p className="px-1 py-8 text-center text-sm text-fog">
        Start typing to search names, facts, and notes.
      </p>
    );
  }

  return (
    <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {state.unindexed > 0 ? (
        <p className="mb-3 text-xs text-fog" role="status">
          Indexing {state.unindexed} item{state.unindexed === 1 ? "" : "s"} in the
          background — semantic matches improve in a moment.
        </p>
      ) : null}

      {state.hits.length === 0 ? (
        <EmptyState
          title="No matches"
          body="None of your people, facts, or notes contain those words yet."
        />
      ) : (
        <ul className="space-y-2">
          {state.hits.map((hit) => (
            <li key={hit.contactId}>
              <Link
                href={`/app/people/${hit.contactId}`}
                onClick={onNavigate}
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
      )}
    </div>
  );
}
