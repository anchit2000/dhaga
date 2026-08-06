"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlinkMessagingIdentityAction } from "@/lib/actions/messaging";

/** Unlink one linked chat: confirm first (destructive, reversible only by
 *  re-linking), then run the action with a spinner and toast-on-failure. */
export function UnlinkButton({ identityId }: { identityId: string }) {
  const [pending, startTransition] = useTransition();

  function handleUnlink(): void {
    if (
      !confirm(
        "Unlink this chat? Messages from it won't be captured until you link it again.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await unlinkMessagingIdentityAction(identityId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-11 shrink-0 text-destructive/90 hover:bg-destructive/10 hover:text-destructive"
      disabled={pending}
      onClick={handleUnlink}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
      Unlink
    </Button>
  );
}
