"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { FormError } from "@/components/app/feedback";
import { CardPhotoCapture } from "./CardPhotoCapture";
import { CAPTURE_MODES, type CaptureMode } from "./capture-mode";
import { PasteCapture } from "./PasteCapture";
import { QuickAddDock } from "./QuickAddDock";
import { useCaptureVoice } from "./useCaptureVoice";

/** Mode strip + paste form + multi-image card tray + inline dock, shared by
 *  the home dock's expanded state and the standalone /app/quick-add page.
 *  The Manual pill is rendered here but its surface (the blank ContactForm hub)
 *  is owned by QuickAddForm, which swaps it in for this whole component. */
export function CaptureForm({
  mode,
  setMode,
  formAction,
  storeCardPhotos,
  pasteTextareaRef,
  photos,
  setPhotos,
  pending = false,
  error,
  notice,
  captureOpen,
  onCaptureToggle,
  inDialog = false,
}: {
  mode: CaptureMode;
  setMode: (mode: CaptureMode) => void;
  formAction: (formData: FormData) => void;
  storeCardPhotos: boolean;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  /** The card-image tray: several photos describing ONE contact. */
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
  /** Extraction in flight — drives the multi-image "Scan" button's loading state. */
  pending?: boolean;
  error?: string;
  notice?: string;
  captureOpen: boolean;
  onCaptureToggle?: () => void;
  /** True when rendered inside the capture Dialog, where the dock must sit
   *  in-flow instead of floating (see QuickAddDock's `floating` prop). */
  inDialog?: boolean;
}) {
  const voice = useCaptureVoice(pasteTextareaRef);
  // Off the home dock (the standalone page / nav dialog) the paste tab carries
  // its own mic, so suppress the dock's now-redundant Voice item there
  // (supported:false hides it) while keeping Camera / Upload. On the home dock
  // the dock owns voice, so the inline mic stays hidden instead.
  const inlineVoice = !inDialog;
  const dockVoice = {
    supported: inlineVoice ? false : voice.supported,
    listening: voice.listening,
    transcribing: voice.transcribing,
    loadingProgress: voice.loadingProgress,
    start: () => {
      setMode("paste");
      voice.start();
    },
    stop: voice.stop,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {CAPTURE_MODES.map(({ mode: option, label }) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              mode === option
                ? "border-amber/40 bg-amber/15 font-medium text-amber"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "photo" ? (
        <CardPhotoCapture
          storeCardPhotos={storeCardPhotos}
          photos={photos}
          setPhotos={setPhotos}
          pending={pending}
          formAction={formAction}
        />
      ) : (
        <PasteCapture
          formAction={formAction}
          pasteTextareaRef={pasteTextareaRef}
          voice={voice}
          showVoice={inlineVoice}
        />
      )}

      <FormError message={error} />
      {notice ? <p className="text-sm text-fog">{notice}</p> : null}

      <QuickAddDock
        formAction={formAction}
        voice={dockVoice}
        pasteTextareaRef={pasteTextareaRef}
        captureOpen={captureOpen}
        onCaptureToggle={onCaptureToggle}
        floating={!inDialog}
      />
    </div>
  );
}
