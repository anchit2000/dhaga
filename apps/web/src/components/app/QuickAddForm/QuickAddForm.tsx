"use client";

import { useRef, useState } from "react";
import { type QuickAddState } from "@/lib/actions/quick-add";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { CARD_SCAN_MESSAGES, QUICK_ADD_MESSAGES } from "@/utils/constants/loader-messages";
import type { EventOption } from "../EventPicker";
import { captureDialogState } from "./capture-dialog-state";
import { CaptureForm } from "./CaptureForm";
import { DisambiguationPanel } from "./DisambiguationPanel";
import { QuickAddDock } from "./QuickAddDock";
import { QuickAddManual } from "./QuickAddManual";
import { QuickAddResultDialog } from "./QuickAddResultDialog";
import { useQuickAdd } from "./useQuickAdd";

type Mode = "paste" | "photo";

/** Capture (paste, card photo, voice, or live webcam) → review-and-save with event attach. */
export function QuickAddForm({
  events,
  defaultEventId,
  storeCardPhotos,
  homeDock = false,
  aiUsage,
}: {
  events: EventOption[];
  defaultEventId?: string;
  storeCardPhotos: boolean;
  homeDock?: boolean;
  aiUsage?: string;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [captureOpen, setCaptureOpen] = useState(!homeDock);
  // Skip-AI escape hatch: swap the capture UI for a blank ContactForm.
  const [manual, setManual] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, formAction, pending } = useQuickAdd();

  // A parsed capture opens the review dialog; a dock scan that fails opens the
  // capture dialog so its error is visible (see capture-dialog-state). Both are
  // derived from the action result, dismissible via a per-result token.
  const [dismissed, setDismissed] = useState<QuickAddState | undefined>(undefined);
  const { resultOpen, captureErrorOpen } = captureDialogState(state, dismissed, homeDock);
  const dismissResult = (): void => {
    setDismissed(state);
    if (homeDock) setCaptureOpen(false);
  };

  if (state.matches && state.matches.length > 1 && state.sourceText) {
    return (
      <DisambiguationPanel matches={state.matches} sourceText={state.sourceText} onCreateNew={formAction} />
    );
  }

  const captureForm = (
    // Relative wrapper so the extraction loader can overlay the form while it
    // stays mounted — unmounting would drop the user's uncaptured paste/photo.
    <div className="relative">
      <CaptureForm
        mode={mode}
        setMode={setMode}
        formAction={formAction}
        storeCardPhotos={storeCardPhotos}
        pasteTextareaRef={pasteTextareaRef}
        photos={photos}
        setPhotos={setPhotos}
        pending={pending}
        error={state.error}
        notice={state.notice}
        captureOpen={captureOpen}
        onCaptureToggle={homeDock ? () => setCaptureOpen((open) => !open) : undefined}
        onManual={() => setManual(true)}
        inDialog={homeDock}
      />
      {pending ? (
        <ThreadLoader
          overlay
          messages={mode === "photo" ? CARD_SCAN_MESSAGES : QUICK_ADD_MESSAGES}
        />
      ) : null}
    </div>
  );

  const manualForm = (
    <QuickAddManual
      events={events}
      defaultEventId={defaultEventId}
      onBack={() => setManual(false)}
    />
  );

  const resultDialog = state.contact ? (
    <QuickAddResultDialog
      open={resultOpen}
      onDismiss={dismissResult}
      contact={state.contact}
      via={state.via}
      notice={state.notice}
      sourceText={state.sourceText}
      images={state.images}
      events={events}
      defaultEventId={defaultEventId}
    />
  ) : null;

  if (!homeDock) {
    return (
      <div className="pb-28">
        {manual ? manualForm : captureForm}
        {resultDialog}
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Keep the capture Dialog MOUNTED and drive it by `open` — a successful
          scan flips resultOpen true in the same commit that opens the result
          Dialog, so unmounting this one mid-open would leave Base UI's modal
          manager wedged and the result Dialog would never paint. Letting `open`
          go false runs the normal close→open handoff between the two dialogs. */}
      <Dialog
        open={(captureOpen || captureErrorOpen) && !resultOpen}
        onOpenChange={(open) => {
          if (open) {
            setCaptureOpen(true);
          } else {
            setManual(false);
            dismissResult();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>{manual ? "Add someone manually" : "Capture someone"}</DialogTitle>
          <DialogDescription>
            {manual
              ? "Type in what you know — no AI, saved straight to your graph."
              : "Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt."}
          </DialogDescription>
          {aiUsage && !manual ? <p className="font-mono text-[10px] uppercase tracking-wider text-fog/60">{aiUsage}</p> : null}
          {manual ? manualForm : captureForm}
        </DialogContent>
      </Dialog>
      {!captureOpen && !captureErrorOpen && !resultOpen ? (
        <QuickAddDock
          formAction={formAction}
          onVoiceStart={() => { setCaptureOpen(true); setMode("paste"); }}
          pasteTextareaRef={pasteTextareaRef}
          captureOpen={captureOpen}
          onCaptureToggle={() => setCaptureOpen(true)}
        />
      ) : null}
      {/* Dock capture (camera/upload) submits straight to the action while the
          capture dialog is closed, so the in-form loader is hidden. Surface a
          branded scanning state so the wait has feedback instead of looking
          like nothing happened. (When the dialog is open its own overlay runs.) */}
      {pending && !captureOpen ? (
        <div className="dark fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm">
          <ThreadLoader messages={CARD_SCAN_MESSAGES} />
        </div>
      ) : null}
      {resultDialog}
    </div>
  );
}
