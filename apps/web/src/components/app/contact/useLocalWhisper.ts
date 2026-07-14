"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { decodeTo16kMono } from "./whisper-audio";
import type { WorkerResponse } from "./whisper-protocol";
import { getModelLoadServerState, getModelLoadState, subscribeModelLoad, transcribe } from "./whisper-model-loader";

/**
 * On-device dictation via Whisper (transformers.js), for browsers where the
 * native Web Speech API is unavailable (Firefox) or present but silently
 * broken (Brave, vanilla Chromium block the network call it depends on).
 * Records with MediaRecorder, decodes to 16kHz mono, and transcribes on the
 * shared Whisper worker (see whisper-model-loader) so the ~40MB model
 * download and inference never block the UI.
 */

export function useLocalWhisper(onFinalText: (text: string) => void) {
  const supported = typeof MediaRecorder !== "undefined";
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const modelLoad = useSyncExternalStore(subscribeModelLoad, getModelLoadState, getModelLoadServerState);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Release the mic if the component unmounts mid-recording (e.g. the user
  // navigates away without hitting stop) rather than leaving it captured.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start(): Promise<void> {
    if (!supported || listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setTranscribing(true);
        try {
          const audio = await decodeTo16kMono(new Blob(chunksRef.current));
          transcribe(audio, false, (message: WorkerResponse) => {
            if (message.status === "complete") {
              setTranscribing(false);
              if (message.text) onFinalText(message.text);
            } else if (message.status === "error") {
              setTranscribing(false);
              toast.error(`Local transcription failed: ${message.message}`);
            }
          });
        } catch {
          setTranscribing(false);
          toast.error("Couldn't process the recording — try again.");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch {
      toast.error("Microphone access was denied or unavailable.");
    }
  }

  function stop(): void {
    // Stop the tracks directly rather than waiting on the recorder's own
    // onstop — the mic indicator should clear the instant the user asks,
    // not whenever the async recorder event chain gets to it. Harmless if
    // onstop's own track.stop() call above runs right after; stopping an
    // already-stopped track is a documented no-op.
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  const loadingProgress = modelLoad.status === "loading" ? modelLoad.progress : null;
  return { supported, listening, transcribing, loadingProgress, partialText: null, start, stop };
}
