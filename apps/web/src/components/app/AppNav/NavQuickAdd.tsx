"use client";

import { useState, type ReactElement } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickAddForm } from "@/components/app/QuickAddForm";

/**
 * Global capture entry point in the app nav: an amber primary action that opens
 * the shared QuickAddForm (paste / voice / card photo → review → save) in a
 * dialog, so adding a person is one click from every /app screen. The form owns
 * the review + save; a successful save redirects to the new contact, unmounting
 * this dialog. events is empty and storeCardPhotos falls back to the app default
 * here — the nav is a client component with no server data to hand down; the
 * save action re-reads the real photo setting server-side, so this only sets the
 * capture hint, never actual storage. Existing-event attach and the AI-usage
 * line stay on the fuller /app/quick-add page (still linked from the More menu).
 */
export function NavQuickAdd(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="default"
            className="h-11 w-11 gap-1.5 rounded-full p-0 sm:h-9 sm:w-auto sm:px-4"
          />
        }
      >
        <UserPlus className="size-5 sm:size-4" />
        <span className="sr-only sm:not-sr-only">Add</span>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Add someone</DialogTitle>
        <DialogDescription>
          Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.
        </DialogDescription>
        <QuickAddForm events={[]} storeCardPhotos />
      </DialogContent>
    </Dialog>
  );
}
