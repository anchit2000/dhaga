"use client";

import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { ConnectionFacet } from "@/lib/repo/connections";
import { LoadButton } from "../shared";

/** The query input, relationship-type select, apply and clear controls —
 *  split from index.tsx to keep the component under the 150-line rule. */
export function ConnectionsFilterBar({
  draftQuery,
  setDraftQuery,
  facets,
  selectedFacets,
  setSelectedFacets,
  isFetching,
  apply,
}: {
  draftQuery: string;
  setDraftQuery: Dispatch<SetStateAction<string>>;
  facets: readonly ConnectionFacet[];
  selectedFacets: readonly string[];
  setSelectedFacets: Dispatch<SetStateAction<string[]>>;
  isFetching: boolean;
  apply: () => void;
}): React.ReactElement {
  return (
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
  );
}
