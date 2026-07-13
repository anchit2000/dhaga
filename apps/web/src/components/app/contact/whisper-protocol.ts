/** Message shapes shared between the Whisper worker and every hook that
 *  talks to it (batch and real-time dictation both use the same worker). */

export type WorkerRequest = {
  type: "transcribe";
  audio: Float32Array;
  /** Fast, short-context pass over a rolling buffer instead of one chunked
   *  pass over the whole clip — see useRealtimeWhisper. */
  realtime?: boolean;
};

export type WorkerResponse =
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "complete"; text: string }
  | { status: "error"; message: string };
