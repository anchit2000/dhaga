"use client";

import { useFormStatus } from "react-dom";
import { useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { noSubscription } from "@/lib/utils";
import { setSttEngineAction } from "@/lib/actions/settings";
import type { SttEngine } from "@/lib/repo/settings";

function EngineOption({
  value,
  active,
  disabled,
  title,
  description,
}: {
  value: SttEngine;
  active: boolean;
  disabled?: boolean;
  title: string;
  description: string;
}) {
  const { pending } = useFormStatus();
  return (
    <form action={setSttEngineAction} className="flex-1">
      <input type="hidden" name="engine" value={value} />
      <button
        type="submit"
        disabled={pending || active || disabled}
        aria-pressed={active}
        className={`w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-default ${
          active ? "border-amber/50 bg-amber/10" : "border-seam hover:border-wash/30"
        } ${disabled && !active ? "opacity-50" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-paper">{title}</p>
          {pending ? <Loader2 className="size-3.5 animate-spin text-fog" /> : null}
        </div>
        <p className="mt-1 text-xs text-fog">{description}</p>
      </button>
    </form>
  );
}

/** Voice-note dictation engine — see useDictation for why this exists:
 *  the browser's Web Speech API is free but unsupported on Firefox and
 *  silently broken on Brave/vanilla Chromium; on-device Whisper works
 *  everywhere at the cost of a one-time model download; the real-time
 *  variant of that same model needs WebGPU. */
export function VoiceInputSetting({ engine }: { engine: SttEngine }) {
  const webgpuSupported = useSyncExternalStore(
    noSubscription,
    () => Boolean((navigator as unknown as { gpu?: unknown }).gpu),
    () => false,
  );
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Voice dictation</p>
        <p className="mt-1 text-sm text-fog">
          How voice notes and voice search get transcribed. All three keep
          every word on your device — none ever uploads audio.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <EngineOption
          value="browser"
          active={engine === "browser"}
          title="Browser (default)"
          description="Free, instant, no download. Works in Chrome, Edge, and Safari. Not available in Firefox; unreliable in Brave and Chromium."
        />
        <EngineOption
          value="local"
          active={engine === "local"}
          title="On-device model"
          description="Downloads a small speech model once (~40MB), then works offline in every browser, including Firefox and Brave."
        />
        <EngineOption
          value="realtime"
          active={engine === "realtime"}
          disabled={!webgpuSupported}
          title="Real-time (WebGPU)"
          description={
            webgpuSupported
              ? "Same on-device model, but text updates live while you talk instead of after you stop."
              : "Needs a WebGPU-capable browser (Chrome or Edge) — unavailable here."
          }
        />
      </div>
    </div>
  );
}
