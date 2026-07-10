"use client";

import { useActionState, useRef, useState } from "react";
import {
  extractQuickAddAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCropper } from "../PhotoCropper";
import type { SessionOption } from "../SessionPicker";
import { SubmitButton } from "../SubmitButton";
import { downscalePhoto } from "../downscalePhoto";
import { PhotoCaptureInput } from "./PhotoCaptureInput";
import { QuickAddDock } from "./QuickAddDock";
import { QuickAddResult } from "./QuickAddResult";

type Mode = "paste" | "photo";

/** Capture (paste, card photo, voice, or live webcam) → review-and-save with session attach. */
export function QuickAddForm({
  sessions,
  defaultSessionId,
  storeCardPhotos,
}: {
  sessions: SessionOption[];
  defaultSessionId?: string;
  storeCardPhotos: boolean;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction] = useActionState<QuickAddState, FormData>(
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
        sessions={sessions}
        defaultSessionId={defaultSessionId}
      />
    );
  }

  return (
    <div className="space-y-4 pb-28">
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
          <SubmitButton>Extract contact</SubmitButton>
        </form>
      ) : (
        <form action={formAction} className="space-y-4">
          <PhotoCaptureInput storeCardPhotos={storeCardPhotos} onPhotoSelected={setPhotoToCrop} />
          <SubmitButton>Scan card</SubmitButton>
        </form>
      )}

      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}

      <QuickAddDock
        formAction={formAction}
        onVoiceStart={() => setMode("paste")}
        pasteTextareaRef={pasteTextareaRef}
      />

      {photoToCrop ? (
        <PhotoCropper
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onConfirm={(cropped) => {
            setPhotoToCrop(null);
            const formData = new FormData();
            formData.set("photo", cropped);
            formAction(formData);
          }}
        />
      ) : null}
    </div>
  );
}
