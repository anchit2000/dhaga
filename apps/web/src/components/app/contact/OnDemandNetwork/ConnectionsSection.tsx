"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePagedData } from "@/lib/data";
import type { ConnectionFacet, ConnectionItem } from "@/lib/repo/connections";
import { ConnectionsList } from "../ConnectionsList";
import { Empty, LoadButton, SectionError, fetchNetworkPage, mergeById } from "./shared";

interface ConnectionsPage {
  items: ConnectionItem[];
  nextCursor: string | null;
  facets: ConnectionFacet[];
}

interface ConnectionsFilter {
  q: string;
  /** `source:value` params resolved from the facet catalog at apply time. */
  facetParams: string[];
}

export function ConnectionsSection({ contactId }: { contactId: string }) {
  const [started, setStarted] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
  const [facets, setFacets] = useState<ConnectionFacet[]>([]);
  const [filter, setFilter] = useState<ConnectionsFilter>({ q: "", facetParams: [] });

  const { pages, error, isFetching, hasMore, loadMore, refetch } = usePagedData<ConnectionsPage>({
    key: ["contact-network", contactId, "connections", filter.q, filter.facetParams.join("|")],
    fetchPage: (cursor, signal) => {
      const params = new URLSearchParams({ section: "connections" });
      if (cursor) params.set("cursor", cursor);
      if (filter.q) params.set("q", filter.q);
      for (const facet of filter.facetParams) params.append("facet", facet);
      return fetchNetworkPage(contactId, params, signal);
    },
    nextCursor: (page) => page.nextCursor,
    enabled: started,
  });

  // The facet catalog is sticky: a filtered page with no facets keeps the
  // last known list so applied chips stay resolvable. Synced during render
  // (React's alternative to setState-in-effect) — page objects are cached, so
  // the reference check settles immediately.
  const latest = [...pages].reverse().find((page) => page.facets.length > 0);
  if (latest && latest.facets !== facets) setFacets(latest.facets);

  function apply(): void {
    const facetParams = selectedFacets.flatMap((key) => {
      const facet = facets.find((item) => `${item.source}|${item.value}` === key);
      return facet ? [`${facet.source}:${facet.value}`] : [];
    });
    const next = { q: draftQuery.trim(), facetParams };
    if (next.q === filter.q && next.facetParams.join("|") === filter.facetParams.join("|")) {
      refetch();
    } else {
      setFilter(next);
    }
  }

  if (!started || pages.length === 0) {
    return (
      <div className="space-y-3">
        <LoadButton loading={isFetching} onClick={() => (started ? refetch() : setStarted(true))}>
          Show connections
        </LoadButton>
        <SectionError error={error} />
      </div>
    );
  }

  const connections = mergeById(pages.map((page) => page.items));
  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <input
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Filter people…"
          className="h-8 min-w-40 flex-1 rounded-full border border-seam bg-well px-3 text-xs outline-none focus:border-amber/50"
        />
        <select
          value=""
          onChange={(event) => {
            const value = event.target.value;
            if (value) setSelectedFacets((current) => [...new Set([...current, value])]);
          }}
          aria-label="Relationship filter"
          className="h-8 max-w-full rounded-full border border-seam bg-well px-3 text-xs text-paper outline-none focus:border-amber/50"
        >
          <option value="">All relationship types</option>
          {facets
            .filter((facet) => !selectedFacets.includes(`${facet.source}|${facet.value}`))
            .map((facet) => (
            <option key={`${facet.source}|${facet.value}`} value={`${facet.source}|${facet.value}`}>
              {facet.label} ({facet.count})
            </option>
            ))}
        </select>
        <LoadButton loading={isFetching} onClick={apply}>
          Apply
        </LoadButton>
        {selectedFacets.length > 0 || draftQuery ? (
          <button
            type="button"
            onClick={() => {
              setSelectedFacets([]);
              setDraftQuery("");
            }}
            className="inline-flex size-8 items-center justify-center rounded-full border border-seam text-fog hover:text-paper"
            aria-label="Clear connection filters"
          >
            <X className="size-3" />
          </button>
        ) : null}
      </form>
      {selectedFacets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Active relationship filters">
          {selectedFacets.map((key) => {
            const facet = facets.find((item) => `${item.source}|${item.value}` === key);
            if (!facet) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedFacets((current) => current.filter((item) => item !== key))}
                className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-1 text-[10px] text-amber"
                aria-label={`Remove ${facet.label} filter`}
              >
                {facet.label} <X className="size-2.5" />
              </button>
            );
          })}
        </div>
      ) : null}
      {connections.length > 0 ? (
        <ConnectionsList connections={connections} />
      ) : (
        <Empty label="No connections match these filters." />
      )}
      {hasMore ? (
        <LoadButton loading={isFetching} onClick={loadMore}>
          Load more connections
        </LoadButton>
      ) : null}
      <SectionError error={error} />
    </div>
  );
}
