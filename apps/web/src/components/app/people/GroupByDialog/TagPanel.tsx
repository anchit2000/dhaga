"use client";

import { useState, useTransition } from "react";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { bulkTagContactsAction } from "@/lib/actions/contacts";

/** Tag is purely additive, so this leg carries no overwrite warning. */
export function TagPanel({
  contactIds,
  onCancel,
  onSuccess,
}: {
  contactIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [tag, setTag] = useState("");
  const [pending, startTransition] = useTransition();
  const count = contactIds.length;

  function submit(): void {
    const value = tag.trim();
    if (!value) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("tag", value);
      formData.set("op", "add");
      const result = await bulkTagContactsAction(formData);
      if (!result.ok) return toastError(result.error);
      onSuccess(`Tagged ${count} contacts "${value}"`);
    });
  }

  return (
    <TabsContent value="tag" className="space-y-3 pt-3">
      <div className="space-y-1.5">
        <Label htmlFor="group-tag-input" className="text-fog">
          Tag
        </Label>
        <Input
          id="group-tag-input"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && tag.trim()) submit();
          }}
          placeholder="e.g. Investor"
          disabled={pending}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} loading={pending} disabled={!tag.trim() || pending}>
          Tag contacts
        </Button>
      </DialogFooter>
    </TabsContent>
  );
}
