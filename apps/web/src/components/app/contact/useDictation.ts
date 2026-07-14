"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { noSubscription } from "@/lib/utils";
import { useSttEngine } from "./SttEngineContext";
import { useLocalWhisper } from "./useLocalWhisper";
import { useRealtimeWhisper } from "./useRealtimeWhisper";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "./browser-speech";

/** How long to let the browser engine listen with zero results (not even
 *  an interim one) before treating it as the Brave/vanilla-Chromium silent
 *  failure rather than the user just not having spoken yet. */
const SILENT_FAILURE_MS = 3_000;

/**
 * Browser speech recognition (M3's voice capture, web edition): free, no
 * API cost, no audio leaves the capture pipeline we don't control — the
 * browser engine transcribes and we only ever see text. Unsupported on
 * Firefox and silently broken on Brave/vanilla Chromium (they block the
 * network call this depends on) — see useLocalWhisper for the fallback.
 */

export interface DictationState {
  supported: boolean;
  listening: boolean;
  /** True while a recorded clip is being transcribed (local engine only —
   *  the browser engine streams results live, so there's no separate wait). */
  transcribing: boolean;
  /** Model download percentage on first local-engine use; null otherwise. */
  loadingProgress: number | null;
  /** Live rolling transcript while listening — real-time engine only. */
  partialText: string | null;
  start(): void;
  stop(): void;
}

function useBrowserDictation(onFinalText: (text: string) => void): DictationState {
  // SSR-safe support check without a hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscription,
    () => Boolean(getSpeechRecognitionCtor()),
    () => false,
  );
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSilenceTimer(): void {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function start(): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || listening) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      clearSilenceTimer();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onFinalText(result[0].transcript.trim());
      }
    };
    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
    };
    recognition.onerror = () => {
      clearSilenceTimer();
      setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    // Brave and vanilla Chromium expose SpeechRecognition but block the
    // network call it depends on, so it just listens forever with no
    // interim or final results — no onerror ever fires. Zero results after
    // a few seconds (plenty of time for even a short utterance to produce
    // at least an interim result) is the only signal we get that it's
    // silently broken rather than the user not having spoken yet.
    silenceTimerRef.current = setTimeout(() => {
      toast("Browser dictation isn't picking up any speech", {
        description:
          "This happens in Brave and some Chromium builds that block the recognition service it depends on. Try the on-device model instead.",
        action: {
          label: "Open settings",
          onClick: () => router.push("/app/settings#voice-dictation"),
        },
      });
    }, SILENT_FAILURE_MS);
  }

  function stop(): void {
    clearSilenceTimer();
    recognitionRef.current?.stop();
  }

  return { supported, listening, transcribing: false, loadingProgress: null, partialText: null, start, stop };
}

/** Dispatches to the browser's native engine or one of the on-device Whisper
 *  engines per the user's Settings choice — callers never know which. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  const engine = useSttEngine();
  // Hooks must run unconditionally; the inactive engine(s) stay idle (no
  // mic/model work happens until their own start() is called).
  const browser = useBrowserDictation(onFinalText);
  const local = useLocalWhisper(onFinalText);
  const realtime = useRealtimeWhisper(onFinalText);
  if (engine === "local") return local;
  if (engine === "realtime") return realtime;
  return browser;
}
