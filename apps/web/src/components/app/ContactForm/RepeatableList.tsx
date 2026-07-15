"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/**
 * Add/remove wrapper for a list of like rows (a person's phones, jobs,
 * addresses…). Immutable updates only — each row edit maps to a fresh array so
 * the parent's controlled state, and the serialized payload, stay in sync.
 */
export function RepeatableList<T>({
  items,
  onChange,
  makeEmpty,
  addLabel,
  renderRow,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  makeEmpty: () => T;
  addLabel: string;
  renderRow: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const updateAt = (index: number) => (patch: Partial<T>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-lg border border-seam bg-wash/[0.02] p-3"
        >
          <div className="min-w-0 flex-1 space-y-2">{renderRow(item, updateAt(index))}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, makeEmpty()])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}
