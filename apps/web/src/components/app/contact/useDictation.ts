"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { noSubscription } from "@/lib/utils";
import { useSttEngine } from "./SttEngineContext";
import { useLocalWhisper } from "./useLocalWhisper";

/**
 * Browser speech recognition (M3's voice capture, web edition): free, no
 * API cost, no audio leaves the capture pipeline we don't control — the
 * browser engine transcribes and we only ever see text. Unsupported on
 * Firefox and silently broken on Brave/vanilla Chromium (they block the
 * network call this depends on) — see useLocalWhisper for the fallback.
 */

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface DictationState {
  supported: boolean;
  listening: boolean;
  /** True while a recorded clip is being transcribed (local engine only —
   *  the browser engine streams results live, so there's no separate wait). */
  transcribing: boolean;
  /** Model download percentage on first local-engine use; null otherwise. */
  loadingProgress: number | null;
  start(): void;
  stop(): void;
}

function useBrowserDictation(onFinalText: (text: string) => void): DictationState {
  // SSR-safe support check without a hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscription,
    () => Boolean(getCtor()),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function start(): void {
    const Ctor = getCtor();
    if (!Ctor || listening) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onFinalText(result[0].transcript.trim());
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop(): void {
    recognitionRef.current?.stop();
  }

  return { supported, listening, transcribing: false, loadingProgress: null, start, stop };
}

/** Dispatches to the browser's native engine or the on-device Whisper
 *  fallback per the user's Settings choice — callers never know which. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  const engine = useSttEngine();
  // Hooks must run unconditionally; the inactive engine stays idle (no
  // mic/model work happens until its own start() is called).
  const browser = useBrowserDictation(onFinalText);
  const local = useLocalWhisper(onFinalText);
  return engine === "local" ? local : browser;
}
