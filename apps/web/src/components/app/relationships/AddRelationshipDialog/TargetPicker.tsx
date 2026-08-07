"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTargetSearchState } from "@/components/app/graph/use-target-search";
import {
  GRAPH_TARGET_RESULTS_DISMISS_MS,
  RELATIONSHIP_KIND_LABELS,
} from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";
import { CreatePersonPanel } from "./CreatePersonPanel";

/**
 * Debounced typeahead over /api/graph/targets (contacts, companies, entities,
 * events) — same shared hook as WarmPathPanel's target search. The fixed
 * source node is excluded so a node can't relate to itself. When the person
 * isn't in the graph yet, "Add a new person…" creates one inline (mirroring
 * PredicateField's "Create new type…" flow) and selects it, so the add takes
 * over without leaving the dialog.
 *
 * The dropdown always says which empty state it is in — searching, failed, or
 * genuinely no matches. Reported live: mid-search the list showed nothing but
 * "Add a new person…", which reads as "search is broken" for someone who is in
 * the graph, and a failed request looked exactly the same as no results.
 */
export function TargetPicker({
  sourceId,
  value,
  onSelect,
}: {
  sourceId: string;
  value: GraphTarget | null;
  onSelect: (target: GraphTarget | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const search = useTargetSearchState(query, { enabled: open && !value && !creating });
  const results = search.targets.filter((target) => target.id !== sourceId);
  const settled = !search.loading && !search.failed;
  const idle = settled && query.trim().length === 0;
  const empty = settled && !idle && results.length === 0;
  /** Every path above puts one status line above "Add a new person…". */
  const status = search.loading || search.failed || idle || empty;

  return (
    <div className="relative">
      <Input
        value={value ? value.label : query}
        onChange={(event) => {
          onSelect(null);
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() =>
          setTimeout(() => setOpen(false), GRAPH_TARGET_RESULTS_DISMISS_MS)
        }
        placeholder="Search people, companies, events, entities…"
        aria-label="Relationship target"
        className="h-10"
      />
      {open && !value && !creating ? (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-seam bg-panel py-1 shadow-lg">
          {search.loading ? (
            <li className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-fog">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Searching…
            </li>
          ) : null}
          {search.failed ? (
            <li className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
              <span className="text-destructive">Couldn’t search right now.</span>
              <button
                type="button"
                onClick={search.retry}
                className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ember hover:underline"
              >
                Retry
              </button>
            </li>
          ) : null}
          {idle ? (
            <li className="px-2.5 py-1.5 text-sm text-fog">
              Type a name to search your graph.
            </li>
          ) : null}
          {empty ? (
            <li className="px-2.5 py-1.5 text-sm text-fog">No matches for “{query.trim()}”.</li>
          ) : null}
          {results.map((target) => (
            <li key={`${target.kind}:${target.id}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(target);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm text-paper hover:bg-wash/[0.05]"
              >
                <span className="min-w-0">
                  <span className="block truncate">{target.label}</span>
                  {target.sublabel ? (
                    <span className="block truncate text-xs text-fog">{target.sublabel}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-fog">
                  {RELATIONSHIP_KIND_LABELS[target.kind]}
                </span>
              </button>
            </li>
          ))}
          <li className={results.length > 0 || status ? "border-t border-seam" : undefined}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full px-2.5 py-1.5 text-left text-sm text-ember hover:bg-wash/[0.05]"
            >
              Add a new person…
            </button>
          </li>
        </ul>
      ) : null}

      {creating ? (
        <CreatePersonPanel
          initialName={query.trim()}
          onCreated={(target) => {
            onSelect(target);
            setCreating(false);
            setOpen(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
