"use client";

import type { ReactElement } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** One contact slot for the manual relationship / fact hub: an
 *  {@link EntityCombobox} (contacts only) until one is picked, then a clearable
 *  chip. Selecting clears the search input (clearOnSelect) so the same field is
 *  reused to change the pick. */
export function ContactPickerField({
  label,
  value,
  onSelect,
  placeholder,
}: {
  label: string;
  value: GraphTarget | null;
  onSelect: (target: GraphTarget | null) => void;
  placeholder: string;
}): ReactElement {
  return (
    <div className="space-y-1.5">
      <Label className="text-fog">{label}</Label>
      {value ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-seam bg-panel px-3 py-2">
          <span className="min-w-0 truncate text-sm text-paper">{value.label}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-fog transition-colors hover:text-paper"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <EntityCombobox
          kinds={["contact"]}
          onSelect={onSelect}
          placeholder={placeholder}
          clearOnSelect
          inputClassName="h-11"
        />
      )}
    </div>
  );
}
