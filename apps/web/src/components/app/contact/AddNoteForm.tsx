"use client";

import { useActionState, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { addNoteAction, type NoteFormState } from "@/lib/actions/notes";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "../SubmitButton";
import { useDictation } from "./useDictation";
import { DictationProgress } from "./DictationProgress";

export function AddNoteForm({ contactId }: { contactId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dictated, setDictated] = useState(false);
  const { supported, listening, transcribing, loadingProgress, partialText, start, stop } = useDictation((text) => {
    const el = textareaRef.current;
    if (!el) return;
    el.value = el.value ? `${el.value.replace(/\s+$/, "")} ${text}` : text;
    setDictated(true);
  });
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      const result = await addNoteAction(previous, formData);
      if (!result.error) {
        formRef.current?.reset();
        setDictated(false);
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
        name="body"
        required
        rows={3}
        placeholder={
          supported
            ? "Type — or tap the mic and just talk. Facts get extracted automatically."
            : "What did you learn about them? Facts get extracted automatically."
        }
      />
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-ember/90">{state.notice}</p> : null}
      <div className="flex items-center gap-2">
        <SubmitButton>Add note</SubmitButton>
        {supported ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={transcribing || loadingProgress !== null}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition-colors disabled:opacity-60 ${
              listening
                ? "border-red-400/50 text-red-400"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {listening ? (
              <>
                <Square className="size-3" />
                <span className="mr-0.5 inline-block size-1.5 animate-pulse rounded-full bg-red-400" />
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
