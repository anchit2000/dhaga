"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useTargetSearch } from "@/components/app/graph/use-target-search";
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
  const targets = useTargetSearch(query, { enabled: open && !value && !creating });
  const results = targets.filter((target) => target.id !== sourceId);

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
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-fog/70">
                  {RELATIONSHIP_KIND_LABELS[target.kind]}
                </span>
              </button>
            </li>
          ))}
          <li className={results.length > 0 ? "border-t border-seam" : undefined}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full px-2.5 py-1.5 text-left text-sm text-amber hover:bg-wash/[0.05]"
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
