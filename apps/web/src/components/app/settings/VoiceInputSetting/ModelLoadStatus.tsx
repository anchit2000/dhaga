"use client";

import { Loader2 } from "lucide-react";
import {
  cancelModelLoad,
  retryModelLoad,
  type ModelLoadState,
} from "@/components/app/contact/whisper-model-loader";

/** Downloads once, in the background, whenever `local`/`realtime` is the active
 *  engine — see SttEngineProvider for the trigger. Only shown once the user has
 *  opted into an on-device Whisper engine; browser/Dhaga-Voice users never see it. */
export function ModelLoadStatus({ state }: { state: ModelLoadState }) {
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-seam pt-4 text-xs text-fog">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          Downloading on-device model… {state.progress}%
        </span>
        <button
          type="button"
          onClick={cancelModelLoad}
          className="shrink-0 text-fog underline decoration-fog/40 underline-offset-2 hover:text-paper"
        >
          Cancel
        </button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-seam pt-4 text-xs">
        <p className="text-red-400" role="alert">
          Model download failed: {state.message}
        </p>
        <button
          type="button"
          onClick={retryModelLoad}
          className="shrink-0 text-amber underline decoration-amber/40 underline-offset-2 hover:text-paper"
        >
          Retry
        </button>
      </div>
    );
  }
  if (state.status === "ready") {
    return <p className="border-t border-seam pt-4 text-xs text-fog">On-device model downloaded — works offline.</p>;
  }
  return null;
}
