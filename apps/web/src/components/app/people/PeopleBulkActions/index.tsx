"use client";

import { useRef, useState } from "react";
import { Building2, EyeOff, Link2, Star, StarOff, Tag, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitMergeIcon } from "@/components/ui/animated-icons";
import { PERSON_KIND_LABELS } from "@/utils/constants/person-kind";
import { AddToCompanyDialog } from "../AddToCompanyDialog";
import { BulkAffiliationDialog } from "../BulkAffiliationDialog";
import { BulkDeleteDialog } from "../BulkDeleteDialog";
import { BulkTagDialog } from "../BulkTagDialog";
import { ContactMergeDialog } from "../ContactMergeDialog";
import { GroupByDialog } from "../GroupByDialog";
import { useBulkFlagActions } from "./use-bulk-flag-actions";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";

type OpenDialog = "merge" | "company" | "affiliation" | "tag" | "group" | "delete" | null;

/**
 * The action triggers slotted into the People {@link BulkActionBar}: merge,
 * add-to-company, tag, group-by, star/unstar, person/service, and delete. Each
 * dialog clears the parent selection on success via `onClear`; the two
 * flag-flipping actions live in {@link useBulkFlagActions}.
 */
export function PeopleBulkActions({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const mergeIconRef = useRef<AnimatedIconHandle>(null);
  const { pending, starOp, kindOp, setStarred, setPersonKind } = useBulkFlagActions({
    ids,
    onClear,
  });

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
      <Button variant="outline" size="sm" onClick={() => setDialog("group")}>
        <Users /> Group by
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPersonKind("service")}
        loading={pending && kindOp === "service"}
        disabled={pending}
        title="Keep these off suggestions — they stay listed in People"
      >
        <EyeOff /> {PERSON_KIND_LABELS.service}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPersonKind("person")}
        loading={pending && kindOp === "person"}
        disabled={pending}
      >
        <User /> Is a person
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
      <GroupByDialog
        contactIds={ids}
        open={dialog === "group"}
        onOpenChange={(open) => setDialog(open ? "group" : null)}
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
