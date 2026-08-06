"use client";

import { useAsyncData, useDebouncedValue } from "@/lib/data";
import { GRAPH_TARGET_SEARCH_DEBOUNCE_MS } from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";

export interface TargetSearchOptions {
  kinds?: readonly string[];
  enabled?: boolean;
  preload?: boolean;
}

export interface TargetSearchState {
  targets: GraphTarget[];
  /** A search is on its way — still debouncing, or the request is in flight.
   *  Callers MUST distinguish this from "no matches": an empty dropdown that
   *  only offers "Add a new person…" reads as a broken search. */
  loading: boolean;
  /** The last search failed (offline, 401, server error). Never silent: a
   *  failed search and an empty result look identical otherwise, which is what
   *  made a transient failure look like "search stopped working". */
  failed: boolean;
  /** Re-run the failed search (the fetch is otherwise only re-triggered by
   *  typing, so the same query would stay stuck on its cached error). */
  retry: () => void;
}

/**
 * Debounced typeahead over /api/graph/targets — shared by WarmPathPanel's
 * target search, EntityCombobox and the add-relationship TargetPicker.
 * Returns [] until the debounced query settles, so a stale dropdown never
 * shows mid-typing; `loading`/`failed` let the surface say which of the three
 * empty states it is in. One retry absorbs a transient blip (a cold DB
 * connection) that would otherwise leave the query stranded on a cached error.
 */
export function useTargetSearchState(
  query: string,
  { kinds, enabled = true, preload = false }: TargetSearchOptions = {},
): TargetSearchState {
  const normalized = query.trim();
  const debounced = useDebouncedValue(normalized, GRAPH_TARGET_SEARCH_DEBOUNCE_MS);
  const settled = debounced === normalized;
  const wanted = enabled && (preload || normalized.length > 0);
  const { data, error, isFetching, refetch } = useAsyncData<{ targets: GraphTarget[] }>({
    key: ["graph-targets", debounced, kinds ? kinds.join(",") : "all", preload ? "list" : "typed"],
    fetcher: async (signal) => {
      const params = new URLSearchParams({ q: debounced });
      if (kinds) params.set("kinds", kinds.join(","));
      if (preload) params.set("list", "1");
      const res = await fetch(`/api/graph/targets?${params}`, { signal });
      if (!res.ok) throw new Error(`graph target search failed (${res.status})`);
      return (await res.json()) as { targets: GraphTarget[] };
    },
    enabled: enabled && settled && (preload || debounced.length > 0),
    staleMs: 30_000,
    retries: 1,
  });
  // Client-side kind filter is belt-and-braces for servers without the param.
  const targets =
    !enabled || !settled || !data
      ? []
      : kinds
        ? data.targets.filter((target) => kinds.includes(target.kind))
        : data.targets;
  return {
    targets,
    // The debounce window counts as loading: without it the dropdown sits
    // visibly empty for 300ms after every keystroke.
    loading: wanted && (!settled || isFetching),
    failed: wanted && settled && !isFetching && error !== null,
    retry: refetch,
  };
}

/** Results only — for surfaces that render no loading/error state of their own. */
export function useTargetSearch(query: string, options?: TargetSearchOptions): GraphTarget[] {
  return useTargetSearchState(query, options).targets;
}
