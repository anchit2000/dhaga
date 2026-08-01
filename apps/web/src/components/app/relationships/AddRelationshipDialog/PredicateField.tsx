"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GRAPH_TARGET_RESULTS_DISMISS_MS } from "@/utils/constants/graph";
import type { RelationshipTypeOption } from "@/lib/actions/relationship-types";
import { CreateTypePanel } from "./CreateTypePanel";
import { EditTypePanel } from "./EditTypePanel";
import { filterPredicateOptions, type PredicateOption } from "./predicate-options";

/**
 * Searchable predicate select: type to filter built-ins + the user's custom
 * types, or create a new type inline via CreateTypePanel. Custom types also
 * get a pencil to edit their labels in place via EditTypePanel.
 */
export function PredicateField({
  options,
  value,
  onSelect,
  onTypeCreated,
  onTypeUpdated,
}: {
  options: PredicateOption[];
  value: PredicateOption | null;
  onSelect: (option: PredicateOption | null) => void;
  onTypeCreated: (created: RelationshipTypeOption) => void;
  onTypeUpdated: (updated: RelationshipTypeOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const results =
    !value && (focused || editingId !== null) && !creating
      ? filterPredicateOptions(options, query)
      : [];

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
      {results.length > 0 || (focused && !value && !creating) || editingId !== null ? (
        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-seam bg-panel py-1 shadow-lg">
          {results.map((option) => (
            <li key={option.slug}>
              <div className="flex w-full items-center gap-1 py-1.5 pr-1.5 pl-2.5 hover:bg-wash/[0.05]">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setEditingId(null);
                  }}
                  className="flex flex-1 items-center justify-between gap-2 text-left text-sm text-paper"
                >
                  <span className="truncate">{option.forward}</span>
                  {option.custom ? (
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-ember">
                      Custom
                    </span>
                  ) : null}
                </button>
                {option.custom && option.id ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingId(option.id ?? null);
                    }}
                    aria-label={`Edit ${option.forward}`}
                    className="shrink-0 rounded-full p-1 text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {editingId === option.id && option.id ? (
                <EditTypePanel
                  type={{
                    id: option.id,
                    slug: option.slug,
                    forwardLabel: option.forward,
                    inverseLabel: option.inverse ?? "",
                  }}
                  onSaved={(updated) => {
                    onTypeUpdated(updated);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : null}
            </li>
          ))}
          <li className={results.length > 0 ? "border-t border-seam" : undefined}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full px-2.5 py-1.5 text-left text-sm text-ember hover:bg-wash/[0.05]"
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
