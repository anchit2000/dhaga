"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { noSubscription } from "@/lib/utils";
import { decodeTo16kMono, WHISPER_SAMPLE_RATE } from "./whisper-audio";
import type { WorkerResponse } from "./whisper-protocol";

/**
 * Real-time on-device dictation: keeps re-transcribing a rolling ~30s audio
 * window while the user talks, so text updates live instead of waiting for
 * the mic to stop (see useLocalWhisper for that simpler batch mode). Same
 * model and cache as the batch engine — only the generation options differ.
 * WebGPU-only: repeated whole-buffer inference can't keep up on WASM, so
 * this engine reports unsupported there rather than feeling sluggish.
 */

const MAX_SAMPLES = WHISPER_SAMPLE_RATE * 30;

function hasWebGPU(): boolean {
  return Boolean((navigator as unknown as { gpu?: unknown }).gpu);
}

export function useRealtimeWhisper(onFinalText: (text: string) => void) {
  const webgpuSupported = useSyncExternalStore(noSubscription, hasWebGPU, () => false);
  const supported = webgpuSupported && typeof MediaRecorder !== "undefined";
  const [listening, setListening] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [partialText, setPartialText] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const stoppingRef = useRef(false);
  const lastTextRef = useRef("");

  function getWorker(): Worker {
    if (!workerRef.current) {
      const worker = new Worker(new URL("./whisper-worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.status === "loading") setLoadingProgress(message.progress);
        else if (message.status === "ready") setLoadingProgress(null);
        else if (message.status === "complete") {
          busyRef.current = false;
          if (message.text) lastTextRef.current = message.text;
          if (stoppingRef.current) {
            stoppingRef.current = false;
            setFinishing(false);
            setPartialText(null);
            if (lastTextRef.current) onFinalText(lastTextRef.current);
          } else {
            setPartialText(message.text || null);
            void runPass();
          }
        } else if (message.status === "error") {
          busyRef.current = false;
          stoppingRef.current = false;
          setLoadingProgress(null);
          setFinishing(false);
          toast.error(`Real-time transcription failed: ${message.message}`);
        }
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }

  async function runPass(): Promise<void> {
    if (busyRef.current || chunksRef.current.length === 0) return;
    busyRef.current = true;
    try {
      const audio = await decodeTo16kMono(new Blob(chunksRef.current));
      const trimmed = audio.length > MAX_SAMPLES ? audio.slice(-MAX_SAMPLES) : audio;
      getWorker().postMessage({ type: "transcribe", audio: trimmed, realtime: true }, [trimmed.buffer]);
    } catch {
      busyRef.current = false;
      toast.error("Couldn't process the recording — try again.");
    }
  }

  async function start(): Promise<void> {
    if (!supported || listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      lastTextRef.current = "";
      busyRef.current = false;
      stoppingRef.current = false;
      setPartialText(null);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          void runPass();
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        // No audio was ever captured, so no pass got triggered by the final
        // flush above — nothing left to wait on.
        if (stoppingRef.current && !busyRef.current) {
          stoppingRef.current = false;
          setFinishing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setListening(true);
    } catch {
      toast.error("Microphone access was denied or unavailable.");
    }
  }

  function stop(): void {
    if (!listening) return;
    stoppingRef.current = true;
    setFinishing(true);
    // MediaRecorder.stop() fires one last "dataavailable" with any
    // remaining audio before firing "stop" — that final flush's runPass()
    // (or the in-flight pass already running) is what onmessage below
    // finalizes against.
    recorderRef.current?.stop();
  }

  return { supported, listening, transcribing: finishing, loadingProgress, partialText, start, stop };
}
