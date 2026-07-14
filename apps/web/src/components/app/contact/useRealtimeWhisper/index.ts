"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { noSubscription } from "@/lib/utils";
import { getModelLoadServerState, getModelLoadState, subscribeModelLoad } from "../whisper-model-loader";
import { RealtimeRecorder } from "./recorder";

/**
 * Real-time on-device dictation: keeps re-transcribing a rolling window of
 * audio while the user talks, so text updates live instead of waiting for
 * the mic to stop (see useLocalWhisper for that simpler batch mode). Same
 * model and cache as the batch engine — only the generation options
 * differ. WebGPU-only: repeated whole-buffer inference can't keep up on
 * WASM, so this engine reports unsupported there rather than feeling
 * sluggish.
 *
 * The actual capture/epoch-rollover/transcribe-pass logic lives in
 * RealtimeRecorder (recorder.ts), independent of React — this hook just
 * wires its callbacks to component state.
 */

function hasWebGPU(): boolean {
  return Boolean((navigator as unknown as { gpu?: unknown }).gpu);
}

export function useRealtimeWhisper(onFinalText: (text: string) => void) {
  const webgpuSupported = useSyncExternalStore(noSubscription, hasWebGPU, () => false);
  const supported = webgpuSupported && typeof MediaRecorder !== "undefined";
  const [listening, setListening] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [partialText, setPartialText] = useState<string | null>(null);
  const modelLoad = useSyncExternalStore(subscribeModelLoad, getModelLoadState, getModelLoadServerState);
  const onFinalTextRef = useRef(onFinalText);
  const recorderRef = useRef<RealtimeRecorder | null>(null);

  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  });

  function getRecorder(): RealtimeRecorder {
    recorderRef.current ??= new RealtimeRecorder({
      onListeningChange: setListening,
      onFinishingChange: setFinishing,
      onPartialText: setPartialText,
      onFinalText: (text) => onFinalTextRef.current(text),
    });
    return recorderRef.current;
  }

  // Release the mic if the component unmounts mid-recording (e.g. the user
  // navigates away without hitting stop) rather than leaving it captured.
  useEffect(() => {
    return () => recorderRef.current?.dispose();
  }, []);

  async function start(): Promise<void> {
    if (!supported || listening) return;
    await getRecorder().start();
  }

  function stop(): void {
    if (!listening) return;
    getRecorder().stop();
  }

  return {
    supported,
    listening,
    transcribing: finishing,
    loadingProgress: modelLoad.status === "loading" ? modelLoad.progress : null,
    partialText,
    start,
    stop,
  };
}
