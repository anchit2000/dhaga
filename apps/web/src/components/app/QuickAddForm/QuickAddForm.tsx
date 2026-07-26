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
  const [photos, setPhotos] = useState<File[]>([]);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(
    async (previous, formData) => {
      const photoFiles = formData
        .getAll("photo")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (photoFiles.length > 0) {
        // Downscale each image before upload, then re-emit them all as `photo`
        // entries (the server reads getAll("photo") and merges them into one).
        const downscaled = await Promise.all(photoFiles.map((file) => downscalePhoto(file)));
        formData.delete("photo");
        for (const file of downscaled) formData.append("photo", file);
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
        photos={photos}
        setPhotos={setPhotos}
        pending={pending}
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Review scanned contact</DialogTitle>
        <QuickAddResult
          contact={state.contact}
          via={state.via}
          notice={state.notice}
          sourceText={state.sourceText}
          images={state.images}
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
      {/* Keep the capture Dialog MOUNTED and drive it by `open` — a successful
          scan flips resultOpen true in the same commit that opens the result
          Dialog, so unmounting this one mid-open would leave Base UI's modal
          manager wedged and the result Dialog would never paint. Letting `open`
          go false runs the normal close→open handoff between the two dialogs. */}
      <Dialog open={captureOpen && !resultOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Capture someone</DialogTitle>
          <DialogDescription>
            Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.
          </DialogDescription>
          {aiUsage ? <p className="font-mono text-[10px] uppercase tracking-wider text-fog/60">{aiUsage}</p> : null}
          {captureForm}
        </DialogContent>
      </Dialog>
      {!captureOpen && !resultOpen ? (
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
