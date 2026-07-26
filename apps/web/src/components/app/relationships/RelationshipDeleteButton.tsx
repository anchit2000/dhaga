"use client";

import { X } from "lucide-react";

/** Per-row relationship delete (tombstone) with a confirm — the edge may have
 *  come from a note the user doesn't remember writing, so never delete silently.
 *  The write itself is owned by the parent list (optimistic remove + Retry on
 *  failure); this button just confirms and hands off. */
export function RelationshipDeleteButton({
  name,
  role,
  onDelete,
}: {
  name: string;
  role: string;
  onDelete: () => void;
}) {
  function remove(): void {
    if (!confirm(`Remove “${name} — ${role}”? The relationship disappears from both pages and the graph.`)) return;
    onDelete();
  }

  return (
    <button
      type="button"
      onClick={remove}
      aria-label={`Remove relationship with ${name}`}
      title={`Remove relationship with ${name}`}
      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper"
    >
      <X className="size-3.5" />
    </button>
  );
}
