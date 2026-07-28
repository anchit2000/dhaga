"use client";

import type { ReactElement } from "react";
import type { ExtractedContact } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { EventOption } from "../EventPicker";
import { QuickAddResult } from "./QuickAddResult";

/** Modal shell for the scanned-contact review — the presentation wrapper around
 *  {@link QuickAddResult}, opened once a capture parses into a contact. */
export function QuickAddResultDialog({
  open,
  onDismiss,
  contact,
  via,
  notice,
  sourceText,
  images,
  events,
  defaultEventId,
}: {
  open: boolean;
  onDismiss: () => void;
  contact: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  sourceText?: string;
  images?: CaptureImage[];
  events: EventOption[];
  defaultEventId?: string;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Review scanned contact</DialogTitle>
        <QuickAddResult
          contact={contact}
          via={via}
          notice={notice}
          sourceText={sourceText}
          images={images}
          events={events}
          defaultEventId={defaultEventId}
        />
      </DialogContent>
    </Dialog>
  );
}
