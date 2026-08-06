"use client";

import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { ConnectionFacet } from "@/lib/repo/connections";

/** Active relationship-filter chips, each removable — split from index.tsx
 *  to keep the component under the 150-line rule. */
export function ConnectionsFacetChips({
  selectedFacets,
  facets,
  setSelectedFacets,
}: {
  selectedFacets: readonly string[];
  facets: readonly ConnectionFacet[];
  setSelectedFacets: Dispatch<SetStateAction<string[]>>;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Active relationship filters">
      {selectedFacets.map((key) => {
        const facet = facets.find((item) => `${item.source}|${item.value}` === key);
        if (!facet) return null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedFacets((current) => current.filter((item) => item !== key))}
            className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-1 text-[10px] text-ember"
            aria-label={`Remove ${facet.label} filter`}
          >
            {facet.label} <X className="size-2.5" />
          </button>
        );
      })}
    </div>
  );
}
