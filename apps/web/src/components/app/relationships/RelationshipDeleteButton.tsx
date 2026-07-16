"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteRelationshipAction } from "@/lib/actions/relationships";

/** Per-row relationship delete (tombstone) with a confirm — the edge may have
 *  come from a note the user doesn't remember writing, so never delete silently. */
export function RelationshipDeleteButton({
  edgeId,
  name,
  role,
}: {
  edgeId: string;
  name: string;
  role: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(): void {
    if (!confirm(`Remove “${name} — ${role}”? The relationship disappears from both pages and the graph.`)) return;
    startTransition(async () => {
      const result = await deleteRelationshipAction(edgeId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Remove relationship with ${name}`}
      title={`Remove relationship with ${name}`}
      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper disabled:pointer-events-none"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </button>
  );
}
