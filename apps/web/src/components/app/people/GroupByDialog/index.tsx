"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyPanel } from "./CompanyPanel";
import { LocationPanel } from "./LocationPanel";
import { TagPanel } from "./TagPanel";

type GroupKind = "tag" | "company" | "location";

/**
 * Manually group the selected contacts by a shared tag, company, or
 * location — the People-page counterpart to the auto-suggested Groups tile
 * (`SuggestionsPanel`). Named "Group by" rather than "Create group" because
 * this app already uses "group" for event membership (Add to group); same
 * three-way choice as the auto-suggested clusters, but driven by a
 * hand-picked selection instead of an auto-detected name cluster, and typed
 * once here since there's no cluster label to default to.
 */
export function GroupByDialog({
  contactIds,
  open,
  onOpenChange,
  onDone,
}: {
  contactIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<GroupKind>("tag");

  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
    if (!next) setTab("tag");
  }

  function handleSuccess(message: string): void {
    handleOpenChange(false);
    router.refresh();
    onDone?.();
    toast.success(message);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Group by</DialogTitle>
        <DialogDescription>
          Give {contactIds.length} selected contacts a shared tag, company, or location.
        </DialogDescription>

        <Tabs value={tab} onValueChange={(value) => setTab(value as GroupKind)}>
          <TabsList>
            <TabsTrigger value="tag">Tag</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          <TagPanel
            contactIds={contactIds}
            onCancel={() => handleOpenChange(false)}
            onSuccess={handleSuccess}
          />
          <CompanyPanel
            contactIds={contactIds}
            onCancel={() => handleOpenChange(false)}
            onSuccess={handleSuccess}
          />
          <LocationPanel
            contactIds={contactIds}
            onCancel={() => handleOpenChange(false)}
            onSuccess={handleSuccess}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
