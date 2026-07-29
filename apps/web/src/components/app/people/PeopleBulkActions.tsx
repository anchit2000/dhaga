"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Link2, Star, StarOff, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import { GitMergeIcon } from "@/components/ui/animated-icons";
import { bulkStarContactsAction } from "@/lib/actions/contacts";
import { AddToCompanyDialog } from "./AddToCompanyDialog";
import { BulkAffiliationDialog } from "./BulkAffiliationDialog";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { BulkTagDialog } from "./BulkTagDialog";
import { ContactMergeDialog } from "./ContactMergeDialog";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";

type OpenDialog = "merge" | "company" | "affiliation" | "tag" | "delete" | null;

/**
 * The action triggers slotted into the People {@link BulkActionBar}: merge,
 * add-to-company, tag, star/unstar, and delete. Each dialog clears the parent
 * selection on success via `onClear`.
 */
export function PeopleBulkActions({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [starOp, setStarOp] = useState<"star" | "unstar" | null>(null);
  const [pending, startTransition] = useTransition();
  const mergeIconRef = useRef<AnimatedIconHandle>(null);

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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialog("merge")}
        disabled={ids.length < 2}
        title={ids.length < 2 ? "Select at least 2 contacts to merge" : undefined}
        onMouseEnter={() => mergeIconRef.current?.startAnimation()}
        onMouseLeave={() => mergeIconRef.current?.stopAnimation()}
      >
        <GitMergeIcon ref={mergeIconRef} /> Merge
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialog("company")}>
        <Building2 /> Add to company
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialog("affiliation")}>
        <Link2 /> Change relationship
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialog("tag")}>
        <Tag /> Tag
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStarred(true)}
        loading={pending && starOp === "star"}
        disabled={pending}
      >
        <Star /> Star
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStarred(false)}
        loading={pending && starOp === "unstar"}
        disabled={pending}
      >
        <StarOff /> Unstar
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setDialog("delete")}>
        <Trash2 /> Delete
      </Button>

      <ContactMergeDialog
        ids={ids}
        open={dialog === "merge"}
        onOpenChange={(open) => setDialog(open ? "merge" : null)}
        onMerged={onClear}
      />
      <AddToCompanyDialog
        contactIds={ids}
        open={dialog === "company"}
        onOpenChange={(open) => setDialog(open ? "company" : null)}
        onDone={onClear}
      />
      <BulkAffiliationDialog
        contactIds={ids}
        open={dialog === "affiliation"}
        onOpenChange={(open) => setDialog(open ? "affiliation" : null)}
        onDone={onClear}
      />
      <BulkTagDialog
        contactIds={ids}
        open={dialog === "tag"}
        onOpenChange={(open) => setDialog(open ? "tag" : null)}
        onDone={onClear}
      />
      <BulkDeleteDialog
        contactIds={ids}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        onDone={onClear}
      />
    </>
  );
}
