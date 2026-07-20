"use client";

import { useActionState, useRef, useState } from "react";
import {
  extractQuickAddAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { CARD_SCAN_MESSAGES, QUICK_ADD_MESSAGES } from "@/utils/constants/loader-messages";
import type { EventOption } from "../EventPicker";
import { downscalePhoto } from "../downscalePhoto";
import { CaptureForm } from "./CaptureForm";
import { DisambiguationPanel } from "./DisambiguationPanel";
import { QuickAddDock } from "./QuickAddDock";
import { QuickAddResult } from "./QuickAddResult";

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
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(
    async (previous, formData) => {
      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        formData.set("photo", await downscalePhoto(photo));
        return scanCardAction(previous, formData);
      }
      return extractQuickAddAction(previous, formData);
    },
    {},
  );

  // A parsed capture opens the review form in a dialog (not inline at the page
  // bottom). Derive open-ness from the action result rather than setState-in-an-
  // effect: the review shows whenever there's a contact the user hasn't
  // dismissed; dismissing marks it so a later scan (a new object) re-opens.
  const [dismissedContact, setDismissedContact] = useState<QuickAddState["contact"]>(undefined);
  const resultOpen = Boolean(state.contact) && state.contact !== dismissedContact;
  const dismissResult = (): void => {
    setDismissedContact(state.contact);
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
        photoToCrop={photoToCrop}
        setPhotoToCrop={setPhotoToCrop}
        error={state.error}
        notice={state.notice}
        captureOpen={captureOpen}
        onCaptureToggle={homeDock ? () => setCaptureOpen((open) => !open) : undefined}
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

  const resultDialog = state.contact ? (
    <Dialog open={resultOpen} onOpenChange={(open) => { if (!open) dismissResult(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle>Review scanned contact</DialogTitle>
        <QuickAddResult
          contact={state.contact}
          via={state.via}
          notice={state.notice}
          sourceText={state.sourceText}
          imageBase64={state.imageBase64}
          imageType={state.imageType}
          events={events}
          defaultEventId={defaultEventId}
        />
      </DialogContent>
    </Dialog>
  ) : null;

  if (!homeDock) {
    return (
      <div className="pb-28">
        {captureForm}
        {resultDialog}
      </div>
    );
  }

  return (
    <div className="pb-28">
      {captureOpen && !resultOpen ? (
        <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
          <DialogContent className="max-w-lg">
            <DialogTitle>Capture someone</DialogTitle>
            <DialogDescription>
              Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.
            </DialogDescription>
            {aiUsage ? <p className="font-mono text-[10px] uppercase tracking-wider text-fog/60">{aiUsage}</p> : null}
            {captureForm}
          </DialogContent>
        </Dialog>
      ) : (
        <QuickAddDock
          formAction={formAction}
          onVoiceStart={() => { setCaptureOpen(true); setMode("paste"); }}
          pasteTextareaRef={pasteTextareaRef}
          captureOpen={captureOpen}
          onCaptureToggle={() => setCaptureOpen(true)}
        />
      )}
      {resultDialog}
    </div>
  );
}
