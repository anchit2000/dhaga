"use client";

import type { ReactNode, RefObject } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { CARD_SCAN_MESSAGES } from "@/utils/constants/loader-messages";
import { QuickAddDock } from "./QuickAddDock";

/**
 * The home-dock capture surface: the collapsed floating dock plus the capture
 * Dialog it expands into. Split out of QuickAddForm to keep that an orchestrator
 * under the 150-line rule. The Dialog stays MOUNTED and driven by `open` so the
 * close → open handoff to the result Dialog doesn't wedge Base UI's modal
 * manager (see QuickAddForm's original note).
 */
export function HomeDockCapture({
  isManual,
  aiUsage,
  surface,
  resultDialog,
  captureOpen,
  setCaptureOpen,
  captureErrorOpen,
  resultOpen,
  onDialogClose,
  onVoiceStart,
  formAction,
  pasteTextareaRef,
  pending,
}: {
  isManual: boolean;
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
  formAction: (formData: FormData) => void;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
}) {
  return (
    <div className="pb-28">
      <Dialog
        open={(captureOpen || captureErrorOpen) && !resultOpen}
        onOpenChange={(open) => {
          if (open) setCaptureOpen(true);
          else onDialogClose();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>{isManual ? "Add someone manually" : "Capture someone"}</DialogTitle>
          <DialogDescription>
            {isManual
              ? "Type in what you know — no AI, saved straight to your graph."
              : "Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt."}
          </DialogDescription>
          {aiUsage && !isManual ? (
            <p className="font-mono text-[10px] uppercase tracking-wider text-fog/60">{aiUsage}</p>
          ) : null}
          {surface}
        </DialogContent>
      </Dialog>
      {!captureOpen && !captureErrorOpen && !resultOpen ? (
        <QuickAddDock
          formAction={formAction}
          onVoiceStart={onVoiceStart}
          pasteTextareaRef={pasteTextareaRef}
          captureOpen={captureOpen}
          onCaptureToggle={() => setCaptureOpen(true)}
        />
      ) : null}
      {/* Dock capture (camera/upload) submits straight to the action while the
          capture dialog is closed, so the in-form loader is hidden. Surface a
          branded scanning state so the wait has feedback. */}
      {pending && !captureOpen ? (
        <div className="dark fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm">
          <ThreadLoader messages={CARD_SCAN_MESSAGES} />
        </div>
      ) : null}
      {resultDialog}
    </div>
  );
}
