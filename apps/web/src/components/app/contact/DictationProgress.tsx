import { Loader2 } from "lucide-react";

/** First-time local-Whisper model download, the post-recording transcribe
 *  step, or (real-time engine) the live rolling transcript while still
 *  speaking — all worth surfacing so a wait reads as progress, not a
 *  frozen mic button. */
export function DictationProgress({
  loadingProgress,
  transcribing,
  partialText,
}: {
  loadingProgress: number | null;
  transcribing: boolean;
  partialText: string | null;
}) {
  if (loadingProgress !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-fog">
        <Loader2 className="size-3 animate-spin" />
        Downloading on-device model… {loadingProgress}%
      </span>
    );
  }
  if (transcribing) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-fog">
        <Loader2 className="size-3 animate-spin" />
        Transcribing…
      </span>
    );
  }
  if (partialText) {
    return (
      <span className="flex w-full min-w-0 basis-full items-start gap-1.5 text-xs italic text-fog">
        <span className="mt-0.5 inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-amber" />
        <span className="min-w-0 break-words">{partialText}</span>
      </span>
    );
  }
  return null;
}
