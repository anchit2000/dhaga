"use client";

import { useRef, useState } from "react";
import { ConfirmationCard } from "@/components/app/confirmations/ConfirmationCard";
import type { EventOption } from "../EventPicker";
import { DEFAULT_CAPTURE_MODE, showsManualSurface, type CaptureMode } from "./capture-mode";
import { CaptureForm } from "./CaptureForm";
import { DisambiguationPanel } from "./DisambiguationPanel";
import { HomeDockCapture } from "./HomeDockCapture";
import { QuickAddManual, type SubTab } from "./QuickAddManual";
import { QuickAddResultDialog } from "./QuickAddResultDialog";
import { useCardPhotos } from "./useCardPhotos";
import { useCaptureDialog } from "./useCaptureDialog";
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
  const [manualTab, setManualTab] = useState<SubTab>("person");
  const [captureOpen, setCaptureOpen] = useState(!homeDock);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, formAction, pending } = useQuickAdd();
  const { photos, setPhotos, onPhotosCaptured } = useCardPhotos(setMode, setCaptureOpen);

  // A parsed capture opens the review dialog; a dock scan that fails opens the
  // scan-error dialog. Both are derived from the action result (see
  // useCaptureDialog / capture-dialog-state), dismissible via a per-result token.
  const { resultOpen, captureErrorOpen, dismissResult, reopenAfterScanError, onDialogClose, onVoiceStart } =
    useCaptureDialog(state, homeDock, setMode, setCaptureOpen);

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
    <CaptureForm
      mode={mode}
      setMode={setMode}
      formAction={formAction}
      onPhotosCaptured={onPhotosCaptured}
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
  );

  // Manual is one of the three capture pills; its surface (the sibling's blank
  // ContactForm hub) takes over from CaptureForm. Back returns to the paste tab.
  const surface = showsManualSurface(mode) ? (
    <QuickAddManual
      events={events}
      defaultEventId={defaultEventId}
      tab={manualTab}
      onTabChange={setManualTab}
      onBack={() => setMode("paste")}
    />
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
      wide={showsManualSurface(mode) && manualTab === "person"}
      aiUsage={aiUsage}
      surface={surface}
      resultDialog={resultDialog}
      captureOpen={captureOpen}
      setCaptureOpen={setCaptureOpen}
      captureErrorOpen={captureErrorOpen}
      resultOpen={resultOpen}
      onDialogClose={onDialogClose}
      onVoiceStart={onVoiceStart}
      error={state.error}
      onScanRetry={() => reopenAfterScanError("photo")}
      onScanManual={() => reopenAfterScanError("manual")}
      formAction={formAction}
      onPhotosCaptured={onPhotosCaptured}
      pasteTextareaRef={pasteTextareaRef}
    />
  );
}
