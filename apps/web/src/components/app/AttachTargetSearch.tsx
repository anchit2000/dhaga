"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  GRAPH_TARGET_RESULTS_DISMISS_MS,
  GRAPH_TARGET_SEARCH_DEBOUNCE_MS,
} from "@/utils/constants/graph";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

/**
 * Debounced typeahead over GET /api/graph/targets, restricted to one kind and
 * excluding ids already attached. Multi-pick: choosing a result fires onPick
 * and clears the query so several can be added in a row. Mirrors the
 * add-relationship TargetPicker but only calls the shared endpoint — it owns
 * no search internals (a separate PR does).
 */
export function AttachTargetSearch({
  kind,
  excludeIds,
  onPick,
  placeholder,
  disabled = false,
}: {
  kind: GraphTargetKind;
  excludeIds: ReadonlySet<string>;
  onPick: (target: GraphTarget) => void;
  placeholder: string;
  disabled?: boolean;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState({
    query: "",
    targets: [] as GraphTarget[],
  });
  const normalizedQuery = query.trim();
  const results =
    searchResult.query === normalizedQuery
      ? searchResult.targets.filter((target) => !excludeIds.has(target.id))
      : [];

  useEffect(() => {
    if (!normalizedQuery) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/graph/targets?kinds=${kind}&q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: { targets: GraphTarget[] } = await res.json();
        setSearchResult({ query: normalizedQuery, targets: data.targets });
      } catch {
        if (!controller.signal.aborted) {
          setSearchResult({ query: normalizedQuery, targets: [] });
        }
      }
    }, GRAPH_TARGET_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, kind]);

  function pick(target: GraphTarget): void {
    setQuery("");
    setSearchResult({ query: "", targets: [] });
    onPick(target);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onBlur={() =>
          setTimeout(
            () => setSearchResult({ query: "", targets: [] }),
            GRAPH_TARGET_RESULTS_DISMISS_MS,
          )
        }
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        className="h-11"
      />
      {results.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-seam bg-panel py-1 shadow-lg">
          {results.map((target) => (
            <li key={`${target.kind}:${target.id}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(target)}
                className="flex min-h-11 w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-paper hover:bg-wash/[0.05]"
              >
                <span className="min-w-0">
                  <span className="block truncate">{target.label}</span>
                  {target.sublabel ? (
                    <span className="block truncate text-xs text-fog">{target.sublabel}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
