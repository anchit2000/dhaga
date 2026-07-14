/**
 * Wraps MediaRecorder with periodic rollover: decodeAudioData needs a
 * complete container from its own header, so letting a single recording
 * grow forever would mean decoding more and more audio on every pass the
 * longer someone talks. Rolling over every rolloverMs resets that cost to
 * "one short epoch," while the same underlying getUserMedia stream stays
 * alive throughout (no repeated permission prompts). Knows nothing about
 * decoding or transcription — just hands finished epochs' raw Blobs back
 * via onEpochBlob.
 */
export class EpochRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private rolloverTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(
    private rolloverMs: number,
    private onData: () => void,
    private onEpochBlob: (blob: Blob) => void,
  ) {}

  start(stream: MediaStream): void {
    this.stream = stream;
    this.chunks = [];
    this.stopped = false;
    this.startEpoch();
    this.rolloverTimer = setInterval(() => this.rollover(), this.rolloverMs);
  }

  /** Stops capturing and releases the mic immediately; the final epoch's
   *  blob (if any) arrives via onEpochBlob once the last onstop fires. */
  stopAndRelease(onDone: () => void): void {
    this.stopped = true;
    if (this.rolloverTimer) {
      clearInterval(this.rolloverTimer);
      this.rolloverTimer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        this.flush();
        onDone();
      };
      recorder.stop();
    } else {
      this.flush();
      onDone();
    }
  }

  dispose(): void {
    if (this.rolloverTimer) clearInterval(this.rolloverTimer);
    this.stream?.getTracks().forEach((track) => track.stop());
  }

  private startEpoch(): void {
    if (!this.stream) return;
    const recorder = new MediaRecorder(this.stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.onData();
      }
    };
    recorder.start(1_000);
    this.recorder = recorder;
  }

  private flush(): void {
    if (this.chunks.length === 0) return;
    const blob = new Blob(this.chunks);
    this.chunks = [];
    this.onEpochBlob(blob);
  }

  private rollover(): void {
    const current = this.recorder;
    if (!current || current.state === "inactive") return;
    current.onstop = () => {
      this.flush();
      if (!this.stopped) this.startEpoch();
    };
    current.stop();
  }
}
