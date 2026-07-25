"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { teachVocab } from "@/lib/voice/use-voice-session";
import { useDictation } from "../contact/useDictation";

/**
 * Single dictation owner for the capture flow: wraps useDictation to stream
 * Moonshine partials live into the note textarea as the user talks, and scopes
 * the tap-to-fix word-chip review to just the LAST dictated segment. The review
 * is bounded — a long (e.g. 15-min) note is thousands of words, so past the cap
 * it hides and the textarea stays the editor instead of rendering thousands of
 * chip buttons.
 */

/** Above this many words the last segment is too big to render as chips. */
const REVIEW_WORD_CAP = 80;

function join(a: string, b: string): string {
  return a ? `${a} ${b}` : b;
}

export interface CaptureVoice {
  supported: boolean;
  listening: boolean;
  transcribing: boolean;
  loadingProgress: number | null;
  notice?: string | null;
  start: () => void;
  stop: () => void;
  review: {
    show: boolean;
    text: string;
    onChange: (next: string) => void;
    onWordFix: (before: string, after: string) => void;
  };
}

export function useCaptureVoice(fieldRef: RefObject<HTMLTextAreaElement | null>): CaptureVoice {
  // The field text BEFORE the current dictation; the segment we append to it.
  const baseTextRef = useRef("");
  const [segment, setSegment] = useState("");

  // Final (phonetically corrected) text lands here: overwrite the live partial
  // with the corrected segment and scope the review to it.
  const dictation = useDictation((corrected) => {
    const el = fieldRef.current;
    if (el) el.value = join(baseTextRef.current, corrected);
    setSegment(corrected);
  });
  const { listening, partialText } = dictation;

  // Live streaming: while listening, mirror the rolling partial into the field.
  // Guarded to only run while listening, so it never races the final write above
  // (stop() flips listening false before the final event fires).
  useEffect(() => {
    if (!listening || partialText === null) return;
    const el = fieldRef.current;
    if (el) el.value = join(baseTextRef.current, partialText);
  }, [listening, partialText, fieldRef]);

  // Manual typing while NOT listening invalidates the last segment, so the stale
  // review hides. Mirrors the input-listener cleanup pattern in useVoiceReview.
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const onInput = (): void => {
      if (!listening) setSegment("");
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [listening, fieldRef]);

  function start(): void {
    baseTextRef.current = (fieldRef.current?.value ?? "").replace(/\s+$/, "");
    setSegment("");
    dictation.start();
  }

  const trimmed = segment.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  return {
    supported: dictation.supported,
    listening: dictation.listening,
    transcribing: dictation.transcribing,
    loadingProgress: dictation.loadingProgress,
    notice: dictation.notice,
    start,
    stop: () => dictation.stop(),
    review: {
      show: trimmed.length > 0 && wordCount <= REVIEW_WORD_CAP,
      text: segment,
      onChange: (next: string): void => {
        const el = fieldRef.current;
        if (el) el.value = join(baseTextRef.current, next);
        setSegment(next);
      },
      onWordFix: (before: string, after: string): void => {
        void teachVocab(after, [before]);
      },
    },
  };
}
