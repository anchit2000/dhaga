"use client";

import { useState, useTransition } from "react";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { setContactsLocationAction } from "@/lib/actions/contacts";

/** Overwrites every selected contact's location — same direct-statement
 *  reasoning as CompanyPanel. */
export function LocationPanel({
  contactIds,
  onCancel,
  onSuccess,
}: {
  contactIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();
  const count = contactIds.length;

  function submit(): void {
    const value = location.trim();
    if (!value) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("location", value);
      const result = await setContactsLocationAction(formData);
      if (!result.ok) return toastError(result.error);
      onSuccess(`Set location to ${value} for ${count} contacts`);
    });
  }

  return (
    <TabsContent value="location" className="space-y-3 pt-3">
      <p className="text-xs text-destructive">
        Overwrites the location already set on any of these {count} contacts.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="group-location-input" className="text-fog">
          Location
        </Label>
        <Input
          id="group-location-input"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Chandigarh"
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
          disabled={!location.trim() || pending}
        >
          Overwrite location for {count} contacts
        </Button>
      </DialogFooter>
    </TabsContent>
  );
}
