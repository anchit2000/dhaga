"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormError } from "@/components/app/feedback";
import { deleteCompanyAction } from "@/lib/actions/companies";

/**
 * Single or bulk delete confirm. Deleting a company DETACHES its contacts and
 * positions — their history survives, only the employer link is cleared — so
 * the copy says so explicitly. The body mounts only while open (fresh state per
 * open). Ids are deleted in sequence; the first failure stops and surfaces its
 * message.
 */
export function CompanyDeleteDialog({
  ids,
  singleName,
  open,
  onOpenChange,
  onDeleted,
}: {
  ids: string[];
  singleName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <CompanyDeleteBody
            ids={ids}
            singleName={singleName ?? null}
            onClose={() => onOpenChange(false)}
            onDeleted={onDeleted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CompanyDeleteBody({
  ids,
  singleName,
  onClose,
  onDeleted,
}: {
  ids: string[];
  singleName: string | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const count = ids.length;

  function confirm(): void {
    if (count === 0) return;
    setError(null);
    startTransition(async () => {
      for (const id of ids) {
        const formData = new FormData();
        formData.set("id", id);
        const result = await deleteCompanyAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      onClose();
      router.refresh();
      onDeleted?.();
      toast.success(count === 1 ? "Company deleted." : `Deleted ${count} companies.`);
    });
  }

  const subject = count === 1 ? (singleName ? `“${singleName}”` : "This company") : `${count} companies`;

  return (
    <>
      <DialogTitle>Delete {count === 1 ? "company" : "companies"}?</DialogTitle>
      <DialogDescription>
        {subject} will be deleted. {count === 1 ? "Its" : "Their"} contacts and job history
        are kept — only the company link is removed. This can&apos;t be undone.
      </DialogDescription>
      <FormError message={error} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button variant="destructive" loading={pending} onClick={confirm}>
          Delete {count === 1 ? "company" : `${count} companies`}
        </Button>
      </DialogFooter>
    </>
  );
}
