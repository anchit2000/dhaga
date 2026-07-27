"use client";

import { useTransition } from "react";
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
import { bulkForgetContactsAction } from "@/lib/actions/contacts";

/** Permanent, cascading delete of the selected contacts — behind a confirm dialog. */
export function BulkDeleteDialog({
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
  const [pending, startTransition] = useTransition();
  const count = contactIds.length;

  function confirm(): void {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      const result = await bulkForgetContactsAction(formData);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
      onDone?.();
      toast.success(`Forgot ${count} contacts`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Forget {count} contacts?</DialogTitle>
        <DialogDescription>
          This deletes {count} contacts and all their notes, facts &amp; relationships. This
          can&apos;t be undone.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} loading={pending}>
            Forget contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
