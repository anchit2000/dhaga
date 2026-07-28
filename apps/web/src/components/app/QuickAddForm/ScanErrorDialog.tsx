"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";

/**
 * The graceful failure for a home-dock card scan. The dock submits with the
 * capture dialog CLOSED, so a returned `{ error }` used to render into the
 * (closed) capture surface — after the Manual hub became the default surface it
 * opened a blank "add someone manually" form with no error at all, the silent
 * bounce the user saw. This gives the failure a face: the actual message plus
 * two ways forward — re-shoot the card, or fall back to free manual entry.
 * In-dialog captures (paste / the Card-photo tab) keep showing their error
 * inline via FormError, so this is gated to the dialog-closed case by the caller.
 */
export function ScanErrorDialog({
  open,
  message,
  onClose,
  onRetry,
  onManual,
}: {
  open: boolean;
  message?: string;
  onClose: () => void;
  onRetry: () => void;
  onManual: () => void;
}): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-amber" aria-hidden />
          Couldn’t scan the card
        </DialogTitle>
        <DialogDescription>
          {message ?? "The scan didn’t go through. Try again with a sharper, closer shot — or add the person manually."}
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onManual}>
            Add manually
          </Button>
          <Button onClick={onRetry}>Try again</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
