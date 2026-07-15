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

  if (state.contact) {
    return (
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
    );
  }

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

  if (!homeDock) return <div className="pb-28">{captureForm}</div>;

  return (
    <div className="pb-28">
      {captureOpen ? (
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
    </div>
  );
}
