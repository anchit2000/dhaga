"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addContactsToCompanyAction } from "@/lib/actions/contacts";

/** Give the selected contacts a current position at a company (found or created by name). */
export function AddToCompanyDialog({
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
  const [companyName, setCompanyName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
    if (!next) setCompanyName("");
  }

  function submit(): void {
    const name = companyName.trim();
    if (!name) return;
    const count = contactIds.length;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("companyName", name);
      const result = await addContactsToCompanyAction(formData);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
      onDone?.();
      toast.success(`Added ${count} contacts to ${name}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Add to company</DialogTitle>
        <DialogDescription>
          Pick or type a company — {contactIds.length} contacts get a current role there.
        </DialogDescription>
        <div className="space-y-1.5">
          <Label className="text-fog">Company</Label>
          <EntityCombobox
            kinds={["company"]}
            placeholder="Search or type a company…"
            inputValue={companyName}
            onInputValueChange={setCompanyName}
            onSelect={(target) => setCompanyName(target.label)}
            onCreate={(name) => setCompanyName(name)}
            createLabel="Create company"
            disabled={pending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={!companyName.trim() || pending}>
            Add to company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
