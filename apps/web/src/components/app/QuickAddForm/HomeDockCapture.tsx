"use client";

import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CARD_SCAN_MESSAGES } from "@/utils/constants/loader-messages";
import { CaptureLoader } from "./CaptureLoader";
import { QuickAddDock } from "./QuickAddDock";
import { ScanErrorDialog } from "./ScanErrorDialog";

/**
 * The home-dock capture surface: the collapsed floating dock plus the capture
 * Dialog it expands into. Split out of QuickAddForm to keep that an orchestrator
 * under the 150-line rule. The Dialog stays MOUNTED and driven by `open` so the
 * close → open handoff to the result Dialog doesn't wedge Base UI's modal
 * manager (see QuickAddForm's original note).
 */
export function HomeDockCapture({
  isManual,
  wide,
  aiUsage,
  surface,
  resultDialog,
  captureOpen,
  setCaptureOpen,
  captureErrorOpen,
  resultOpen,
  onDialogClose,
  onVoiceStart,
  error,
  onScanRetry,
  onScanManual,
  formAction,
  onPhotosCaptured,
  pasteTextareaRef,
  pending,
}: {
  isManual: boolean;
  /** The person manual sub-tab hosts the full contact form — widen the dialog
   *  so it can breathe (and reflow into two columns) instead of cramming a rich
   *  form into a 512px modal. AI capture and the simpler manual tabs stay lg. */
  wide: boolean;
  aiUsage?: string;
  surface: ReactNode;
  resultDialog: ReactNode;
  captureOpen: boolean;
  setCaptureOpen: (open: boolean) => void;
  captureErrorOpen: boolean;
  resultOpen: boolean;
  /** Reset mode to the default and dismiss the current result on dialog close. */
  onDialogClose: () => void;
  onVoiceStart: () => void;
  /** The current action error — shown in the scan-error dialog when a dock scan
   *  (capture dialog closed) fails, so the failure isn't a silent bounce. */
  error?: string;
  /** Dismiss the failed scan and reopen capture on the Card-photo tab to reshoot. */
  onScanRetry: () => void;
  /** Dismiss the failed scan and reopen capture on the free Manual tab. */
  onScanManual: () => void;
  formAction: (formData: FormData) => void;
  /** Dock camera frames → the card-photo tray, which opens the capture dialog
   *  so they can be cropped/reordered before the scan (see QuickAddDock). */
  onPhotosCaptured: (files: File[]) => void;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
}) {
  return (
    <div className="pb-28">
      <Dialog
        open={captureOpen && !resultOpen}
        onOpenChange={(open) => {
          if (open) setCaptureOpen(true);
          else onDialogClose();
        }}
      >
        <DialogContent
          className={cn("max-h-[85vh] overflow-y-auto", wide ? "max-w-4xl" : "max-w-lg")}
        >
          <DialogTitle>{isManual ? "Add someone manually" : "Capture someone"}</DialogTitle>
          <DialogDescription>
            {isManual
              ? "Type in what you know — no AI, saved straight to your graph."
              : "Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt."}
          </DialogDescription>
          {aiUsage && !isManual ? (
            <p className="font-mono text-[10px] uppercase tracking-wider text-fog">{aiUsage}</p>
          ) : null}
          {surface}
        </DialogContent>
      </Dialog>
      {/* A dock scan submits with the capture dialog closed; on failure surface
          the error here (not the blank Manual hub the default surface would show)
          with a retry / manual fallback. In-dialog captures show errors inline. */}
      <ScanErrorDialog
        open={captureErrorOpen && !captureOpen && !resultOpen}
        message={error}
        onClose={onDialogClose}
        onRetry={onScanRetry}
        onManual={onScanManual}
      />
      {!captureOpen && !captureErrorOpen && !resultOpen ? (
        <QuickAddDock
          formAction={formAction}
          onPhotosCaptured={onPhotosCaptured}
          onVoiceStart={onVoiceStart}
          pasteTextareaRef={pasteTextareaRef}
          captureOpen={captureOpen}
          onCaptureToggle={() => setCaptureOpen(true)}
        />
      ) : null}
      {/* Dock upload submits straight to the action while the capture dialog is
          closed, so the in-form loader is hidden. Surface a branded scanning
          state so the wait has feedback. (Dock camera frames go to the tray
          instead, and scan from inside the dialog.) */}
      {pending && !captureOpen ? (
        <CaptureLoader className="dark rounded-none" messages={CARD_SCAN_MESSAGES} />
      ) : null}
      {resultDialog}
    </div>
  );
}
