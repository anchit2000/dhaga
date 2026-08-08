"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
  type ComboboxChangeEventDetails,
} from "@/components/ui/combobox";
import { useTargetSearchState } from "@/components/app/graph/use-target-search";
import { EntityComboboxOptions } from "./EntityComboboxOptions";
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
 *
 * The dropdown always says which state it is in — searching, failed, or
 * genuinely no matches — and "Create …" is withheld until the search settles.
 * Reported live: typing an existing company showed nothing but
 * `Create company "Adaptive Waves A"`, which reads as "the search is broken",
 * and a failed request (offline, cold DB, 500) looked exactly like "no matches"
 * with no way to retry short of reloading the page.
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
  preloadOnOpen = false,
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
  preloadOnOpen?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = inputValue ?? internalQuery;
  const setQuery = (value: string, details?: ComboboxChangeEventDetails): void => {
    // Inline free-text mode (input *is* the value: no trigger, no clear-on-select) drops
    // Base UI's empty close-sync `input-clear` (close without a selection) that would wipe
    // the just-typed/created name; real edits/clears arrive as `input-change`/`clear-press`.
    if (!triggerLabel && !clearOnSelect && onInputValueChange && details?.reason === "input-clear") return;
    return onInputValueChange ? onInputValueChange(value) : setInternalQuery(value);
  };

  const search = useTargetSearchState(query, { kinds, enabled: open, preload: preloadOnOpen });
  const results = search.targets.filter((target) => !excludeIds?.has(target.id));
  const trimmed = query.trim();
  const settled = !search.loading && !search.failed;
  // Withheld while in flight: offering "Create X" before the search has come
  // back invites a duplicate of a company that is already in the graph.
  const showCreate =
    !!onCreate &&
    settled &&
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

      <EntityComboboxOptions
        triggerLabel={triggerLabel}
        placeholder={placeholder}
        results={results}
        trimmed={trimmed}
        showCreate={showCreate}
        loading={search.loading}
        failed={search.failed}
        onRetry={search.retry}
        preloadOnOpen={preloadOnOpen}
        createLabel={createLabel}
        onCreateClick={() => {
          onCreate?.(trimmed);
          setOpen(false);
          reset();
        }}
      />
    </Combobox>
  );
}
