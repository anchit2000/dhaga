"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkTagContactsAction } from "@/lib/actions/contacts";

/** Add or remove a single tag across the selected contacts. */
export function BulkTagDialog({
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
  const [tag, setTag] = useState("");
  const [runningOp, setRunningOp] = useState<"add" | "remove" | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
    if (!next) {
      setTag("");
      setRunningOp(null);
    }
  }

  function run(op: "add" | "remove"): void {
    const value = tag.trim();
    if (!value) return;
    const count = contactIds.length;
    setRunningOp(op);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("tag", value);
      formData.set("op", op);
      const result = await bulkTagContactsAction(formData);
      setRunningOp(null);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
      onDone?.();
      toast.success(
        op === "add"
          ? `Tagged ${count} contacts "${value}"`
          : `Removed "${value}" from ${count} contacts`,
      );
    });
  }

  const disabled = !tag.trim() || pending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Tag contacts</DialogTitle>
        <DialogDescription>
          Add or remove one tag across {contactIds.length} contacts.
        </DialogDescription>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-tag-input" className="text-fog">
            Tag
          </Label>
          <Input
            id="bulk-tag-input"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !disabled) run("add");
            }}
            placeholder="e.g. Investor"
            aria-label="Tag"
            disabled={pending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => run("remove")}
            loading={pending && runningOp === "remove"}
            disabled={disabled}
          >
            Remove tag
          </Button>
          <Button
            onClick={() => run("add")}
            loading={pending && runningOp === "add"}
            disabled={disabled}
          >
            Add tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
