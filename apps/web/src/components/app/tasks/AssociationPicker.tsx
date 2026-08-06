"use client";

import { X } from "lucide-react";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { Button } from "@/components/ui/button";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

export interface SelectedAssociation {
  id: string;
  label: string;
}

export function AssociationPicker({
  kind,
  label,
  value,
  onChange,
}: {
  kind: Extract<GraphTargetKind, "contact" | "company">;
  label: string;
  value: SelectedAssociation | null;
  onChange: (value: SelectedAssociation | null) => void;
}): React.ReactElement {
  function select(target: GraphTarget): void {
    onChange({ id: target.id, label: target.label });
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-fog">{label}</span>
      {value ? (
        <div className="flex min-h-11 items-center justify-between rounded-lg border border-line px-3">
          <span className="truncate text-sm text-paper">{value.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-11 min-w-11"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => onChange(null)}
          >
            <X />
          </Button>
        </div>
      ) : (
        <EntityCombobox
          kinds={[kind]}
          onSelect={select}
          placeholder={`Search ${label.toLowerCase()}…`}
          clearOnSelect
          preloadOnOpen
          inputClassName="min-h-11"
        />
      )}
    </div>
  );
}
