"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { GRAPH_TARGET_RESULTS_DISMISS_MS } from "@/utils/constants/graph";
import type { RelationshipTypeOption } from "@/lib/actions/relationship-types";
import { CreateTypePanel } from "./CreateTypePanel";
import { filterPredicateOptions, type PredicateOption } from "./predicate-options";

/**
 * Searchable predicate select: type to filter built-ins + the user's custom
 * types, or create a new type inline via CreateTypePanel.
 */
export function PredicateField({
  options,
  value,
  onSelect,
  onTypeCreated,
}: {
  options: PredicateOption[];
  value: PredicateOption | null;
  onSelect: (option: PredicateOption | null) => void;
  onTypeCreated: (created: RelationshipTypeOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [creating, setCreating] = useState(false);
  const results = !value && focused && !creating ? filterPredicateOptions(options, query) : [];

  return (
    <div className="relative">
      <Input
        value={value ? value.forward : query}
        onChange={(event) => {
          onSelect(null);
          setQuery(event.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), GRAPH_TARGET_RESULTS_DISMISS_MS)}
        placeholder="Search — “father of”, “trains at”…"
        aria-label="Relationship type"
        className="h-10"
      />
      {results.length > 0 || (focused && !value && !creating) ? (
        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-seam bg-panel py-1 shadow-lg">
          {results.map((option) => (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() => onSelect(option)}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm text-paper hover:bg-wash/[0.05]"
              >
                <span className="truncate">{option.forward}</span>
                {option.custom ? (
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-amber/70">
                    Custom
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          <li className={results.length > 0 ? "border-t border-seam" : undefined}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full px-2.5 py-1.5 text-left text-sm text-amber hover:bg-wash/[0.05]"
            >
              Create new type…
            </button>
          </li>
        </ul>
      ) : null}

      {creating ? (
        <CreateTypePanel
          initialForward={query.trim()}
          onCreated={(created) => {
            onTypeCreated(created);
            onSelect({ slug: created.slug, forward: created.forwardLabel, custom: true });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
