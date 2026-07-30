"use client";

import { useActionState, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { addNoteAction, type NoteFormState } from "@/lib/actions/notes";
import { addPhotoNoteAction } from "@/lib/actions/photo-note";
import { FormError } from "@/components/app/feedback";
import { Textarea } from "@/components/ui/textarea";
import { downscalePhoto } from "../downscalePhoto";
import { SubmitButton } from "../SubmitButton";
import { NotePhotoButton, NotePhotoTray } from "./NotePhotoCapture";
import { useDictation } from "./useDictation";
import { DictationProgress } from "./DictationProgress";
import { VoiceNoteReview } from "./VoiceNoteReview";
import { useVoiceReview } from "./useVoiceReview";

export function AddNoteForm({ contactId }: { contactId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dictated, setDictated] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  // Dhaga Voice (Moonshine) transcripts get tap-to-fix word-chips; every other
  // engine keeps the plain textarea-append behavior (voiceReview.onDictate no-ops).
  const voiceReview = useVoiceReview(textareaRef);
  const { supported, listening, transcribing, loadingProgress, partialText, start, stop } = useDictation((text) => {
    const el = textareaRef.current;
    if (!el) return;
    el.value = el.value ? `${el.value.replace(/\s+$/, "")} ${text}` : text;
    setDictated(true);
    voiceReview.onDictate(el.value);
  });
  // Text, voice and photo are three ways into ONE composer, so they share one
  // submit. Photos live in React state (the tray reorders and crops them), so
  // they are appended here — downscaled first, exactly as the card scan does,
  // because a phone photo is 3–10 MB and the model reads it fine at 1024px.
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      let result: NoteFormState;
      if (photos.length > 0) {
        for (const photo of photos) formData.append("photo", await downscalePhoto(photo));
        result = await addPhotoNoteAction(previous, formData);
      } else {
        result = await addNoteAction(previous, formData);
      }
      if (!result.error) {
        formRef.current?.reset();
        setDictated(false);
        setPhotos([]);
        voiceReview.reset();
      }
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="kind" value={dictated ? "voice" : "text"} />
      <Textarea
        ref={textareaRef}
        // A photo carries the note's text on its own, so the typed line becomes
        // optional context the moment one is attached.
        required={photos.length === 0}
        name="body"
        rows={3}
        placeholder={
          photos.length > 0
            ? "Add a line of your own (optional) — the photo's text is read into the note."
            : supported
              ? "Type — or tap the mic and just talk. Facts get extracted automatically."
              : "What did you learn about them? Facts get extracted automatically."
        }
      />
      {voiceReview.show ? (
        <VoiceNoteReview text={voiceReview.text} onChange={voiceReview.onChange} onWordFix={voiceReview.onWordFix} />
      ) : null}
      <NotePhotoTray photos={photos} setPhotos={setPhotos} />
      <FormError message={state.error} />
      {state.notice ? <p className="text-sm text-ember/90">{state.notice}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{photos.length > 0 ? "Read photo into a note" : "Add note"}</SubmitButton>
        <NotePhotoButton photos={photos} setPhotos={setPhotos} />
        {supported ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={transcribing || loadingProgress !== null}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition-colors disabled:opacity-60 ${
              listening
                ? "border-destructive/50 text-destructive"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {listening ? (
              <>
                <Square className="size-3" />
                <span className="mr-0.5 inline-block size-1.5 animate-pulse rounded-full bg-destructive" />
                Listening — tap to stop
              </>
            ) : (
              <>
                <Mic className="size-3.5" />
                Voice note
              </>
            )}
          </button>
        ) : null}
        <DictationProgress loadingProgress={loadingProgress} transcribing={transcribing} partialText={partialText} />
      </div>
    </form>
  );
}
