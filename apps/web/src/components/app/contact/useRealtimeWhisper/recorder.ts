import { toast } from "sonner";
import { decodeTo16kMono, WHISPER_SAMPLE_RATE } from "../whisper-audio";
import { transcribe } from "../whisper-model-loader";
import { PcmBuffer } from "./pcm-buffer";
import { EpochRecorder } from "./epoch-recorder";

const EPOCH_MS = 8_000;
const MAX_PREVIEW_SAMPLES = WHISPER_SAMPLE_RATE * 30;

export interface RealtimeRecorderCallbacks {
  onListeningChange(listening: boolean): void;
  onFinishingChange(finishing: boolean): void;
  onPartialText(text: string | null): void;
  onFinalText(text: string): void;
}

/**
 * Orchestrates real-time dictation: EpochRecorder captures bounded-cost
 * audio epochs, PcmBuffer accumulates their decoded samples, and this
 * class fires rolling preview passes plus one full-quality final pass on
 * stop() — independent of React; the hook in ./index.ts wires it to
 * component state.
 */
export class RealtimeRecorder {
  private pcm = new PcmBuffer();
  private epochs = new EpochRecorder(
    EPOCH_MS,
    () => void this.runPreviewPass(),
    (blob) => this.onEpochBlob(blob),
  );
  private busy = false;
  private stopping = false;
  private lastText = "";
  /** The most recent epoch's decode — finishRecording awaits this so the
   *  final pass never reads the PCM buffer before the last bit of audio
   *  actually lands in it (EpochRecorder hands back blobs synchronously,
   *  decoding is what's async). */
  private pendingDecode: Promise<void> = Promise.resolve();

  constructor(private callbacks: RealtimeRecorderCallbacks) {}

  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pcm.reset();
      this.lastText = "";
      this.busy = false;
      this.stopping = false;
      this.pendingDecode = Promise.resolve();
      this.callbacks.onPartialText(null);
      this.epochs.start(stream);
      this.callbacks.onListeningChange(true);
    } catch {
      toast.error("Microphone access was denied or unavailable.");
    }
  }

  stop(): void {
    if (this.stopping) return;
    this.stopping = true;
    this.callbacks.onFinishingChange(true);
    // Fire immediately, in step with EpochRecorder releasing the mic right
    // away — that's what used to leave the browser's mic-in-use indicator
    // lit after clicking stop, waiting on the async onstop event instead.
    this.callbacks.onListeningChange(false);
    this.epochs.stopAndRelease(() => void this.finishRecording());
  }

  dispose(): void {
    this.epochs.dispose();
  }

  private onEpochBlob(blob: Blob): void {
    this.pendingDecode = this.decodeAndStore(blob);
  }

  private async decodeAndStore(blob: Blob): Promise<void> {
    try {
      this.pcm.push(await decodeTo16kMono(blob));
    } catch {
      // A dropped epoch is just a short gap in context for the next pass,
      // not fatal — unlike when this was the only source of the final text.
    }
  }

  private async waitUntilIdle(): Promise<void> {
    while (this.busy) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async runPreviewPass(): Promise<void> {
    if (this.busy || this.stopping) return;
    const trimmed = this.pcm.preview(MAX_PREVIEW_SAMPLES);
    if (trimmed.length === 0) return;
    this.busy = true;
    transcribe(trimmed, true, (message) => {
      if (message.status === "complete") {
        this.busy = false;
        if (message.text) this.lastText = message.text;
        this.callbacks.onPartialText(message.text || null);
      } else if (message.status === "error") {
        this.busy = false;
        toast.error(`Real-time transcription failed: ${message.message}`);
      }
    });
  }

  /** One clean pass over the whole clip, same treatment the batch engine
   *  gets — the rolling passes above are a fast, capped-length preview;
   *  trusting the last one as final would mean the saved note never got
   *  more than that low-token-cap rough draft. */
  private async finishRecording(): Promise<void> {
    await this.waitUntilIdle();
    await this.pendingDecode;
    const combined = this.pcm.all();
    if (combined.length === 0) {
      this.stopping = false;
      this.callbacks.onFinishingChange(false);
      this.callbacks.onPartialText(null);
      return;
    }
    transcribe(combined, false, (message) => {
      if (message.status === "complete") {
        this.stopping = false;
        this.callbacks.onFinishingChange(false);
        this.callbacks.onPartialText(null);
        const text = (message.text || this.lastText).trim();
        if (text) this.callbacks.onFinalText(text);
      } else if (message.status === "error") {
        this.stopping = false;
        this.callbacks.onFinishingChange(false);
        this.callbacks.onPartialText(null);
        toast.error(`Real-time transcription failed: ${message.message}`);
        if (this.lastText) this.callbacks.onFinalText(this.lastText);
      }
    });
  }
}
