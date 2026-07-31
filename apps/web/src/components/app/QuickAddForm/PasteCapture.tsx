"use client";

import type { RefObject } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "../SubmitButton";
import { VoiceNoteReview } from "../contact/VoiceNoteReview";
import type { CaptureVoice } from "./useCaptureVoice";

/**
 * The "Paste text" tab: the note textarea, an on-tab voice mic, and the
 * tap-to-fix review. The mic reuses the shared {@link CaptureVoice} dictation
 * that streams straight into this textarea. It's shown only off the home dock
 * (`showVoice`) — the dock surfaces its own mic, so a second one there would be
 * redundant.
 */
export function PasteCapture({
  formAction,
  pasteTextareaRef,
  voice,
  showVoice,
  aiGate = null,
}: {
  formAction: (formData: FormData) => void;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  voice: CaptureVoice;
  showVoice: boolean;
  /** No AI credits left: extraction is greyed out. Typing and on-device voice
   *  dictation still work — the text stays, ready for Manual or a new month. */
  aiGate?: string | null;
}) {
  const busy = voice.transcribing || voice.loadingProgress !== null;
  const toggleVoice = (): void => {
    if (busy) return;
    if (voice.listening) {
      voice.stop();
      return;
    }
    voice.start();
    requestAnimationFrame(() => pasteTextareaRef.current?.focus());
  };

  return (
    <form action={formAction} className="space-y-4">
      <Textarea
        ref={pasteTextareaRef}
        name="raw"
        required
        rows={8}
        placeholder={
          "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro… or tap Voice and just talk."
        }
        className="font-mono text-sm"
      />
      {showVoice && voice.supported ? (
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={voice.listening}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
            voice.listening
              ? "border-amber/40 bg-amber/15 font-medium text-ember"
              : "border-seam text-fog hover:text-paper"
          }`}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : voice.listening ? (
            <Square className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
          {busy ? "Loading voice…" : voice.listening ? "Stop" : "Voice"}
        </button>
      ) : null}
      {voice.review.show ? (
        <VoiceNoteReview
          text={voice.review.text}
          onChange={voice.review.onChange}
          onWordFix={voice.review.onWordFix}
        />
      ) : null}
      <SubmitButton disabled={aiGate !== null}>Extract contact</SubmitButton>
    </form>
  );
}
