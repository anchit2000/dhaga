"use client";

import { useRef, useState, useSyncExternalStore } from "react";

/**
 * Browser speech recognition (M3's voice capture, web edition): free, no
 * API cost, no audio leaves the capture pipeline we don't control — the
 * browser engine transcribes and we only ever see text.
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

const noSubscription = () => () => {};

export function useDictation(onFinalText: (text: string) => void) {
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

  return { supported, listening, start, stop };
}
