"use client";

import { useState } from "react";
import { usePagedData } from "@/lib/data";
import type { ConnectionFacet } from "@/lib/repo/connections";
import { ConnectionsList } from "../../ConnectionsList";
import { Empty, LoadButton, SectionError, fetchNetworkPage, mergeById } from "../shared";
import { ConnectionsFacetChips } from "./FacetChips";
import { ConnectionsFilterBar } from "./FilterBar";
import type { ConnectionsFilter, ConnectionsPage } from "./types";

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
      <ConnectionsFilterBar
        draftQuery={draftQuery}
        setDraftQuery={setDraftQuery}
        facets={facets}
        selectedFacets={selectedFacets}
        setSelectedFacets={setSelectedFacets}
        isFetching={isFetching}
        apply={apply}
      />
      {selectedFacets.length > 0 ? (
        <ConnectionsFacetChips
          selectedFacets={selectedFacets}
          facets={facets}
          setSelectedFacets={setSelectedFacets}
        />
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
