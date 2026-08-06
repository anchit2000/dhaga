"use client";

import { Plus } from "lucide-react";
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** The results list / empty state / create row — split from index.tsx to keep
 *  the component under the 150-line rule. Must render as a descendant of the
 *  `Combobox` provider (see index.tsx), same as when this was inline. */
export function EntityComboboxOptions({
  triggerLabel,
  placeholder,
  results,
  trimmed,
  showCreate,
  preloadOnOpen,
  createLabel,
  onCreateClick,
}: {
  triggerLabel?: string;
  placeholder: string;
  results: readonly GraphTarget[];
  trimmed: string;
  showCreate: boolean;
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
      {results.length === 0 && !showCreate ? (
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
