"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEntityAction } from "@/lib/actions/entities";

/** Destructive page-bottom action, styled after ForgetButton on the contact page. */
export function DeleteEntityButton({
  entityId,
  name,
}: {
  entityId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(): void {
    if (
      !confirm(
        `Delete ${name}? Its notes are permanently deleted and its relationships disappear from the graph. There is no undo.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEntityAction(entityId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push("/app/entities");
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-400/90 transition-colors hover:bg-red-400/10 disabled:pointer-events-none"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      Delete this entity
    </button>
  );
}
