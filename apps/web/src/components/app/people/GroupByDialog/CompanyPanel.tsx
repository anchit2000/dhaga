"use client";

import { useState, useTransition } from "react";
import { toastError } from "@/components/app/feedback";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { setContactsCompanyAction } from "@/lib/actions/contacts";

/** Overwrites every selected contact's company — a manual selection is a
 *  direct, confident statement, unlike the auto-suggested clusters' rule of
 *  only filling in contacts that had none. */
export function CompanyPanel({
  contactIds,
  onCancel,
  onSuccess,
}: {
  contactIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [pending, startTransition] = useTransition();
  const count = contactIds.length;

  function submit(): void {
    const name = companyName.trim();
    if (!name) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("companyName", name);
      const result = await setContactsCompanyAction(formData);
      if (!result.ok) return toastError(result.error);
      onSuccess(`Set company to ${name} for ${count} contacts`);
    });
  }

  return (
    <TabsContent value="company" className="space-y-3 pt-3">
      <p className="text-xs text-destructive">
        Overwrites the company already set on any of these {count} contacts.
      </p>
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
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={submit}
          loading={pending}
          disabled={!companyName.trim() || pending}
        >
          Overwrite company for {count} contacts
        </Button>
      </DialogFooter>
    </TabsContent>
  );
}
