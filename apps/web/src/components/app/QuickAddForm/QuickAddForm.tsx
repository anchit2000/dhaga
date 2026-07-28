"use client";

import { useRef, useState } from "react";
import { type QuickAddState } from "@/lib/actions/quick-add";
import { ConfirmationCard } from "@/components/app/confirmations/ConfirmationCard";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { CARD_SCAN_MESSAGES, QUICK_ADD_MESSAGES } from "@/utils/constants/loader-messages";
import type { EventOption } from "../EventPicker";
import { captureDialogState } from "./capture-dialog-state";
import { DEFAULT_CAPTURE_MODE, showsManualSurface, type CaptureMode } from "./capture-mode";
import { CaptureForm } from "./CaptureForm";
import { DisambiguationPanel } from "./DisambiguationPanel";
import { HomeDockCapture } from "./HomeDockCapture";
import { QuickAddManual } from "./QuickAddManual";
import { QuickAddResultDialog } from "./QuickAddResultDialog";
import { useQuickAdd } from "./useQuickAdd";

/** Capture (manual, paste, card photo, voice, or live webcam) → review-and-save
 *  with event attach. Manual is the default tab; the AI modes live behind it. */
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
  const [mode, setMode] = useState<CaptureMode>(DEFAULT_CAPTURE_MODE);
  const [captureOpen, setCaptureOpen] = useState(!homeDock);
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

  // A captured note whose subject is ambiguous/unknown: render the
  // "which person?" confirmation inline (pick existing / create → attach).
  if (state.confirmation) {
    return (
      <section className="space-y-4 rounded-2xl border border-amber/30 bg-panel p-4 sm:p-5">
        <ConfirmationCard confirmation={state.confirmation} nodeTypes={[]} />
        <button type="button" onClick={() => window.location.reload()} className="rounded-full px-3 py-2 text-xs text-fog hover:text-paper">
          Cancel
        </button>
      </section>
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
        <ThreadLoader overlay messages={mode === "photo" ? CARD_SCAN_MESSAGES : QUICK_ADD_MESSAGES} />
      ) : null}
    </div>
  );

  // Manual is one of the three capture pills; its surface (the sibling's blank
  // ContactForm hub) takes over from CaptureForm. Back returns to the paste tab.
  const surface = showsManualSurface(mode) ? (
    <QuickAddManual events={events} defaultEventId={defaultEventId} onBack={() => setMode("paste")} />
  ) : (
    captureForm
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
        {surface}
        {resultDialog}
      </div>
    );
  }

  return (
    <HomeDockCapture
      isManual={showsManualSurface(mode)}
      aiUsage={aiUsage}
      surface={surface}
      resultDialog={resultDialog}
      captureOpen={captureOpen}
      setCaptureOpen={setCaptureOpen}
      captureErrorOpen={captureErrorOpen}
      resultOpen={resultOpen}
      onDialogClose={() => {
        setMode(DEFAULT_CAPTURE_MODE);
        dismissResult();
      }}
      onVoiceStart={() => {
        setCaptureOpen(true);
        setMode("paste");
      }}
      formAction={formAction}
      pasteTextareaRef={pasteTextareaRef}
      pending={pending}
    />
  );
}
