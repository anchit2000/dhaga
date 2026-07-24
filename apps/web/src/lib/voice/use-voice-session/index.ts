"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { noSubscription } from "@/lib/utils";
import type { SessionEvent } from "@dhaga/core/src/voice/types";
import { isWebGpuAvailable } from "@/lib/voice/capability";
import type { DictationState } from "@/components/app/contact/useDictation";
import { ensureRuntime, setActiveSink, releaseActiveSink } from "./runtime";

export { teachVocab } from "./runtime";

/**
 * "Dhaga Voice" (Moonshine) dictation, wired to the useDictation contract.
 * Push-to-talk: start() begins live capture; stop() finalizes through the
 * phonetic teaching layer and hands the corrected text to onFinalText. The
 * engine + VoiceSession are a module-level singleton owned by ./runtime.
 */
const WASM_NOTICE = "WebGPU wasn't available — running the on-device model on CPU, which is slower.";

export function useVoiceSession(onFinalText: (text: string) => void): DictationState {
  // SSR-safe mic-capability check without a hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscription,
    () => typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function",
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [backend, setBackend] = useState<DictationState["backend"]>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const onFinalTextRef = useRef(onFinalText);

  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  });

  // Stable sink: partials stream live; the final (phonetically corrected) goes to the caller.
  const handleEvent = useCallback((event: SessionEvent): void => {
    if (event.type === "partial") setPartialText(event.text);
    else if (event.type === "final") {
      onFinalTextRef.current(event.text);
      setPartialText(null);
    } else if (event.type === "error") toast.error(event.message);
  }, []);

  // Release the mic + relinquish the sink if this surface unmounts mid-record.
  useEffect(() => {
    return () => releaseActiveSink(handleEvent);
  }, [handleEvent]);

  async function start(): Promise<void> {
    if (!supported || listening) return;
    const { engine, session, mic } = ensureRuntime();
    setActiveSink(handleEvent); // route the singleton's events to this surface
    try {
      if (!engine.isReady()) {
        setLoadingProgress(0);
        setNotice(null);
        await engine.load((p) => setLoadingProgress(Math.round(p.progress * 100)));
        // A missing/erroring vocab API must not block dictation — teaching starts empty.
        try {
          await session.init();
        } catch (err) {
          console.warn("voice vocab load failed; continuing without taught terms", err);
        }
        setLoadingProgress(null);
        setBackend(engine.backend);
        if (engine.backend === "wasm") setNotice(WASM_NOTICE);
      }
      session.resetTranscript();
      setPartialText(null);
      await mic.start();
      setListening(true);
    } catch (err) {
      setLoadingProgress(null);
      setListening(false);
      toast.error(err instanceof Error ? err.message : "Voice capture failed.");
    }
  }

  async function stop(): Promise<void> {
    if (!listening) return;
    const { session, mic } = ensureRuntime();
    mic.stop();
    setListening(false);
    setTranscribing(true);
    try {
      await session.endUtterance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setTranscribing(false);
      setPartialText(null);
    }
  }

  return { supported, listening, transcribing, loadingProgress, partialText, backend, notice, start, stop };
}

/** Probe WebGPU once on mount: null while probing, then true/false. Drives the
 *  useDictation Moonshine-vs-browser-fallback decision. */
export function useWebGpuAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void isWebGpuAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}
