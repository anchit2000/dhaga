"use client";

import { useEffect, useState, type RefObject } from "react";
import { teachVocab, useWebGpuAvailable } from "@/lib/voice/use-voice-session";
import { useSttEngine } from "./SttEngineContext";

/**
 * Shared wiring for the tap-to-fix voice-note review, used by both the contact
 * AddNoteForm and the QuickAddDock. Only Dhaga Voice (Moonshine) transcripts get
 * the word-chip review; every other STT engine keeps the plain textarea-append
 * behavior, so `active` gates all of this. The text field stays the single
 * source of truth: `onDictate`/`onChange` write it AND mirror it here, and an
 * `input` listener folds manual typing back in so a later chip-fix can never
 * clobber text typed after the last dictation.
 */
export interface VoiceReview {
  /** Dhaga Voice (Moonshine) is the live engine — the only engine we review. */
  active: boolean;
  /** Render the review: engine is Dhaga Voice and something has been dictated. */
  show: boolean;
  /** Current transcript, kept in sync with the field. */
  text: string;
  /** Fold a just-dictated field value into the review (no-op off Dhaga Voice). */
  onDictate: (fieldValue: string) => void;
  /** Replace the field text after a chip fix (writes the field, mirrors here). */
  onChange: (next: string) => void;
  /** Auto-teach a corrected word: misheard → corrected spelling. */
  onWordFix: (before: string, after: string) => void;
  /** Clear the review (call after a successful submit that resets the field). */
  reset: () => void;
}

export function useVoiceReview(fieldRef: RefObject<HTMLTextAreaElement | null>): VoiceReview {
  // Both hooks run unconditionally (rules-of-hooks) before the && short-circuits.
  const sttEngine = useSttEngine();
  const webGpuAvailable = useWebGpuAvailable();
  const active = sttEngine === "moonshine" && webGpuAvailable !== false;
  const [text, setText] = useState("");
  const [dictated, setDictated] = useState(false);

  useEffect(() => {
    if (!active) return;
    const el = fieldRef.current;
    if (!el) return;
    const sync = (): void => setText(el.value);
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [active, fieldRef]);

  return {
    active,
    show: active && dictated && text.trim().length > 0,
    text,
    onDictate: (fieldValue: string): void => {
      if (!active) return;
      setText(fieldValue);
      setDictated(true);
    },
    onChange: (next: string): void => {
      const el = fieldRef.current;
      if (el) el.value = next;
      setText(next);
    },
    onWordFix: (before: string, after: string): void => {
      void teachVocab(after, [before]);
    },
    reset: (): void => {
      setText("");
      setDictated(false);
    },
  };
}
