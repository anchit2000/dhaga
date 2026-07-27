"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/app/feedback";
import { SubmitButton } from "../SubmitButton";
import { VoiceNoteReview } from "../contact/VoiceNoteReview";
import { CardPhotoCapture } from "./CardPhotoCapture";
import { QuickAddDock } from "./QuickAddDock";
import { useCaptureVoice } from "./useCaptureVoice";

type Mode = "paste" | "photo";

/** Mode toggle + paste form + multi-image card tray + inline dock, shared by
 *  the home dock's expanded state and the standalone /app/quick-add page. */
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
  onManual,
  inDialog = false,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
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
  /** Skip AI and type the person in by hand — shown under every capture mode. */
  onManual: () => void;
  /** True when rendered inside the capture Dialog, where the dock must sit
   *  in-flow instead of floating (see QuickAddDock's `floating` prop). */
  inDialog?: boolean;
}) {
  const voice = useCaptureVoice(pasteTextareaRef);
  // Composed so tapping Voice also switches to the paste form (where the note
  // textarea and its tap-to-fix review live).
  const dockVoice = {
    supported: voice.supported,
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
      <div className="flex gap-1.5">
        {(["paste", "photo"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              mode === option
                ? "border-amber/40 bg-amber/15 font-medium text-amber"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {option === "paste" ? "Paste text" : "Card photo"}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <form action={formAction} className="space-y-4">
          <Textarea
            ref={pasteTextareaRef}
            name="raw"
            required
            rows={8}
            placeholder={
              "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro… or tap Voice below and just talk."
            }
            className="font-mono text-sm"
          />
          {voice.review.show ? (
            <VoiceNoteReview
              text={voice.review.text}
              onChange={voice.review.onChange}
              onWordFix={voice.review.onWordFix}
            />
          ) : null}
          <SubmitButton>Extract contact</SubmitButton>
        </form>
      ) : (
        <CardPhotoCapture
          storeCardPhotos={storeCardPhotos}
          photos={photos}
          setPhotos={setPhotos}
          pending={pending}
          formAction={formAction}
        />
      )}

      <FormError message={error} />
      {notice ? <p className="text-sm text-fog">{notice}</p> : null}

      {/* Escape hatch shown under every capture mode (paste AND card photo):
          skip AI entirely and fill a blank contact form in by hand. */}
      <div className="flex justify-center border-t border-seam/60 pt-3">
        <button
          type="button"
          onClick={onManual}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-fog transition-colors hover:text-paper"
        >
          Prefer to type it in?
          <span className="font-medium text-amber">Add manually</span>
        </button>
      </div>

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
