"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Presentational bar shown above a table when a selection is non-empty. A dumb
 * container: it reports the count and offers "Clear"; callers slot the actual
 * action buttons/dialogs (merge, delete, tag, …) in as `children`. Those
 * children scroll horizontally on narrow viewports so the bar never overflows
 * the page at 375px.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-seam bg-panel px-3 py-2">
      <span className="shrink-0 text-sm font-medium text-paper">{count} selected</span>
      <Button variant="ghost" size="xs" onClick={onClear} className="shrink-0">
        <X /> Clear
      </Button>
      <div className="flex items-center gap-2 overflow-x-auto">{children}</div>
    </div>
  );
}
