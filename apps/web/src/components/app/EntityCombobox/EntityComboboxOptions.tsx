"use client";

import { Loader2, Plus } from "lucide-react";
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** The results list / status rows / create row — split from index.tsx to keep
 *  the component under the 150-line rule. Must render as a descendant of the
 *  `Combobox` provider (see index.tsx), same as when this was inline.
 *  `loading` and `failed` are never collapsed into the empty state: an empty
 *  dropdown that only offers "Create …" reads as a broken search. */
export function EntityComboboxOptions({
  triggerLabel,
  placeholder,
  results,
  trimmed,
  showCreate,
  loading,
  failed,
  onRetry,
  preloadOnOpen,
  createLabel,
  onCreateClick,
}: {
  triggerLabel?: string;
  placeholder: string;
  results: readonly GraphTarget[];
  trimmed: string;
  showCreate: boolean;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  preloadOnOpen: boolean;
  createLabel: string;
  onCreateClick: () => void;
}): React.ReactElement {
  return (
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
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-fog">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          Searching…
        </div>
      ) : null}
      {failed ? (
        <div className="flex items-center justify-between gap-2 px-3 py-3 text-sm">
          <span className="text-destructive">Couldn’t search right now.</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ember hover:underline"
          >
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !failed && results.length === 0 && !showCreate ? (
        <ComboboxEmpty>
          {trimmed ? "No matches." : preloadOnOpen ? "No matches yet." : "Type to search…"}
        </ComboboxEmpty>
      ) : null}
      {showCreate ? (
        <button
          type="button"
          onClick={onCreateClick}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-ember hover:bg-wash/[0.05]"
        >
          <Plus aria-hidden className="size-4" />
          {createLabel} “{trimmed}”
        </button>
      ) : null}
    </ComboboxContent>
  );
}
