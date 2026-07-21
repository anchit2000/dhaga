"use client";

import { useAsyncData, useDebouncedValue } from "@/lib/data";
import { GRAPH_TARGET_SEARCH_DEBOUNCE_MS } from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";

/**
 * Debounced typeahead over /api/graph/targets — shared by WarmPathPanel's
 * target search and the add-relationship TargetPicker. Returns [] until the
 * debounced query settles, so a stale dropdown never shows mid-typing.
 */
export function useTargetSearch(
  query: string,
  {
    kinds,
    enabled = true,
  }: { kinds?: readonly string[]; enabled?: boolean } = {},
): GraphTarget[] {
  const normalized = query.trim();
  const debounced = useDebouncedValue(normalized, GRAPH_TARGET_SEARCH_DEBOUNCE_MS);
  const settled = debounced === normalized;
  const { data } = useAsyncData<{ targets: GraphTarget[] }>({
    key: ["graph-targets", debounced, kinds ? kinds.join(",") : "all"],
    fetcher: async (signal) => {
      const params = new URLSearchParams({ q: debounced });
      if (kinds) params.set("kinds", kinds.join(","));
      const res = await fetch(`/api/graph/targets?${params}`, { signal });
      if (!res.ok) throw new Error(`graph target search failed (${res.status})`);
      return (await res.json()) as { targets: GraphTarget[] };
    },
    enabled: enabled && settled && debounced.length > 0,
    staleMs: 30_000,
  });
  if (!enabled || !settled || !data) return [];
  // Client-side kind filter is belt-and-braces for servers without the param.
  return kinds ? data.targets.filter((target) => kinds.includes(target.kind)) : data.targets;
}
