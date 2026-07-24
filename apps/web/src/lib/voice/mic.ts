/**
 * Microphone capture → 16 kHz mono float32 frames. Push-to-talk: no VAD.
 *
 * getUserMedia → MediaStreamAudioSourceNode → AudioWorkletNode (downsamples the
 * context rate to 16 kHz mono, posts Float32 frames) → onFrame. The worklet is
 * registered from an inline Blob URL so nothing needs a separately served .js
 * file (COEP: credentialless-safe). The AudioContext + worklet module are
 * created once and reused across push-to-talk presses; each start() re-acquires
 * the stream and rebuilds the source/worklet nodes, stop() tears them down.
 *
 * Client-only: touches AudioContext / navigator.mediaDevices, so it must only
 * ever be imported from a "use client" module.
 */
import { SAMPLE_RATE, type PcmFrame } from "@dhaga/core/src/voice/types";
import { PROCESSOR_NAME, WORKLET_SOURCE } from "./worklet-source";

/** Samples per posted frame (~64 ms at 16 kHz) — small enough to feed timely partials. */
const FRAME_SIZE = 1024;

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
};

export interface Mic {
  /** Request mic permission and begin emitting frames via the onFrame callback. */
  start(): Promise<void>;
  /** Stop capture and release the stream. */
  stop(): void;
  readonly active: boolean;
}

export function createMic(onFrame: (frame: PcmFrame) => void): Mic {
  let ctx: AudioContext | null = null;
  let moduleAdded = false;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let worklet: AudioWorkletNode | null = null;
  let active = false;

  async function ensureContext(): Promise<AudioContext> {
    if (!ctx) ctx = new AudioContext();
    if (!moduleAdded) {
      const url = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
      );
      try {
        await ctx.audioWorklet.addModule(url);
        moduleAdded = true;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    return ctx;
  }

  async function acquireStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Microphone access failed: ${detail}`);
    }
  }

  return {
    async start(): Promise<void> {
      if (active) return;
      const context = await ensureContext();
      stream = await acquireStream();
      await context.resume();

      source = context.createMediaStreamSource(stream);
      worklet = new AudioWorkletNode(context, PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { targetSampleRate: SAMPLE_RATE, frameSize: FRAME_SIZE },
      });
      worklet.port.onmessage = (ev): void => {
        onFrame(ev.data as PcmFrame);
      };

      source.connect(worklet);
      // Keep the worklet in the rendering graph so process() keeps being pulled;
      // it writes no output, so nothing audible reaches the speakers.
      worklet.connect(context.destination);
      active = true;
    },

    stop(): void {
      active = false;
      if (worklet) {
        worklet.port.onmessage = null;
        worklet.disconnect();
        worklet = null;
      }
      if (source) {
        source.disconnect();
        source = null;
      }
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
        stream = null;
      }
    },

    get active(): boolean {
      return active;
    },
  };
}
