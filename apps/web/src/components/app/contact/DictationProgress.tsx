import { Loader2 } from "lucide-react";

/** First-time local-Whisper model download, or the post-recording
 *  transcribe step — both are worth surfacing so a multi-second wait
 *  reads as progress, not a frozen mic button. */
export function DictationProgress({
  loadingProgress,
  transcribing,
}: {
  loadingProgress: number | null;
  transcribing: boolean;
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
  return null;
}
