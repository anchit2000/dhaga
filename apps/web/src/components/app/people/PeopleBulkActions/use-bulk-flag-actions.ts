"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { bulkStarContactsAction } from "@/lib/actions/contacts";
import { bulkSetPersonKindAction } from "@/lib/actions/person-kind";
import type { PersonKind } from "@dhaga/core";

/**
 * The two bulk actions that flip a flag straight from the bar with no dialog:
 * star/unstar and the person/service ruling. Split out of the bar's JSX per the
 * file-length rule; they share one transition, so only one can be in flight and
 * the whole bar disables while it is.
 */
export function useBulkFlagActions({
  ids,
  onClear,
}: {
  ids: string[];
  onClear: () => void;
}): {
  pending: boolean;
  starOp: "star" | "unstar" | null;
  kindOp: PersonKind | null;
  setStarred: (starred: boolean) => void;
  setPersonKind: (kind: PersonKind) => void;
} {
  const router = useRouter();
  const [starOp, setStarOp] = useState<"star" | "unstar" | null>(null);
  const [kindOp, setKindOp] = useState<PersonKind | null>(null);
  const [pending, startTransition] = useTransition();

  function setStarred(starred: boolean): void {
    setStarOp(starred ? "star" : "unstar");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(ids));
      formData.set("starred", starred ? "true" : "false");
      const result = await bulkStarContactsAction(formData);
      setStarOp(null);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
      onClear();
      toast.success(`${starred ? "Starred" : "Unstarred"} ${ids.length} contacts`);
    });
  }

  /**
   * Rule a selection person-or-service. The suppressed rows stay in this very
   * table — the bar is how a phone-import dump of vendors gets off Home's
   * suggestions in one pass, and how a batch of real people gets back on. The
   * toast says so, because a bulk hide the user can't see is the failure mode.
   */
  function setPersonKind(kind: PersonKind): void {
    setKindOp(kind);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(ids));
      formData.set("kind", kind);
      const result = await bulkSetPersonKindAction(formData);
      setKindOp(null);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
      onClear();
      toast.success(
        kind === "service"
          ? `${ids.length} contacts hidden from suggestions — still listed here`
          : `${ids.length} contacts back in suggestions`,
      );
    });
  }

  return { pending, starOp, kindOp, setStarred, setPersonKind };
}
