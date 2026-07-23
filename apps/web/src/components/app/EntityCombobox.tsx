"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { useTargetSearch } from "@/components/app/graph/use-target-search";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

/**
 * Lazy-loaded searchable dropdown over graph nodes — the shared replacement for
 * the hand-rolled entity-reference text boxes. Results stream in from
 * GET /api/graph/targets (debounced via the shared `useTargetSearch` hook), so
 * the list is server-filtered and Base UI's own filtering is disabled.
 *
 * Two presentations from one component:
 * - inline (default): the search input is the field itself (e.g. the company
 *   field, where the typed text is also the value — pass `inputValue`).
 * - `triggerLabel`: a compact button opens a popup that holds the search input
 *   (e.g. the contact-page "Add to group" control).
 */
export function EntityCombobox({
  kinds,
  onSelect,
  placeholder,
  disabled = false,
  excludeIds,
  triggerLabel,
  clearOnSelect = false,
  inputValue,
  onInputValueChange,
  onCreate,
  createLabel = "Create",
  inputClassName,
}: {
  kinds: readonly GraphTargetKind[];
  onSelect: (target: GraphTarget) => void;
  placeholder: string;
  disabled?: boolean;
  excludeIds?: ReadonlySet<string>;
  triggerLabel?: string;
  clearOnSelect?: boolean;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  onCreate?: (name: string) => void;
  createLabel?: string;
  inputClassName?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = inputValue ?? internalQuery;
  const setQuery = (value: string): void =>
    onInputValueChange ? onInputValueChange(value) : setInternalQuery(value);

  const results = useTargetSearch(query, { kinds, enabled: open }).filter(
    (target) => !excludeIds?.has(target.id),
  );
  const trimmed = query.trim();
  const showCreate =
    !!onCreate &&
    trimmed.length > 0 &&
    !results.some((target) => target.label.toLowerCase() === trimmed.toLowerCase());

  function reset(): void {
    if (!clearOnSelect) return;
    setQuery("");
    setOpen(false);
  }

  function handleValueChange(target: GraphTarget | null): void {
    if (!target) return;
    onSelect(target);
    reset();
  }

  return (
    <Combobox<GraphTarget>
      items={results}
      filter={null}
      inputValue={query}
      onInputValueChange={setQuery}
      onValueChange={handleValueChange}
      itemToStringLabel={(target) => target.label}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      {triggerLabel ? (
        <ComboboxTrigger
          render={<Button type="button" variant="outline" size="sm" className="h-11" />}
          disabled={disabled}
        >
          <Plus aria-hidden />
          {triggerLabel}
        </ComboboxTrigger>
      ) : (
        <ComboboxInput
          placeholder={placeholder}
          aria-label={placeholder}
          className={inputClassName}
        />
      )}

      <ComboboxContent>
        {triggerLabel ? (
          <div className="p-1">
            <ComboboxInput placeholder={placeholder} aria-label={placeholder} />
          </div>
        ) : null}
        <ComboboxList>
          {(target: GraphTarget) => (
            <ComboboxItem key={`${target.kind}:${target.id}`} value={target}>
              <span className="min-w-0">
                <span className="block truncate">{target.label}</span>
                {target.sublabel ? (
                  <span className="block truncate text-xs text-fog">{target.sublabel}</span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
        {results.length === 0 && !showCreate ? (
          <ComboboxEmpty>{trimmed ? "No matches." : "Type to search…"}</ComboboxEmpty>
        ) : null}
        {showCreate ? (
          <button
            type="button"
            onClick={() => {
              onCreate?.(trimmed);
              reset();
            }}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber hover:bg-wash/[0.05]"
          >
            <Plus aria-hidden className="size-4" />
            {createLabel} “{trimmed}”
          </button>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}
