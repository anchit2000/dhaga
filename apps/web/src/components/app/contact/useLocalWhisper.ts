"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * On-device dictation via Whisper (transformers.js), for browsers where the
 * native Web Speech API is unavailable (Firefox) or present but silently
 * broken (Brave, vanilla Chromium block the network call it depends on).
 * Records with MediaRecorder, decodes to 16kHz mono, and transcribes in a
 * Web Worker so the ~40MB model download and inference never block the UI.
 */

type WorkerMessage =
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "complete"; text: string }
  | { status: "error"; message: string };

async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new OfflineAudioContext(1, 1, 16000);
  const decoded = await context.decodeAudioData(arrayBuffer);
  return decoded.getChannelData(0);
}

export function useLocalWhisper(onFinalText: (text: string) => void) {
  const supported = typeof MediaRecorder !== "undefined";
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function getWorker(): Worker {
    if (!workerRef.current) {
      const worker = new Worker(new URL("./whisper-worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.status === "loading") setLoadingProgress(message.progress);
        else if (message.status === "ready") setLoadingProgress(null);
        else if (message.status === "complete") {
          setTranscribing(false);
          if (message.text) onFinalText(message.text);
        } else if (message.status === "error") {
          setTranscribing(false);
          setLoadingProgress(null);
          toast.error(`Local transcription failed: ${message.message}`);
        }
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }

  async function start(): Promise<void> {
    if (!supported || listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          getWorker().postMessage({ type: "transcribe", audio }, [audio.buffer]);
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
    recorderRef.current?.stop();
  }

  return { supported, listening, transcribing, loadingProgress, start, stop };
}
