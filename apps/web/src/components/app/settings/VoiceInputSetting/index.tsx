"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { setSttEngineAction } from "@/lib/actions/settings";
import { isWebGpuAvailable } from "@/lib/voice/capability";
import {
  getModelLoadServerState,
  getModelLoadState,
  subscribeModelLoad,
} from "@/components/app/contact/whisper-model-loader";
import { ModelLoadStatus } from "./ModelLoadStatus";
import type { SttEngine } from "@/lib/repo/settings";

function EngineOption({
  value,
  active,
  disabled,
  title,
  description,
  notice,
}: {
  value: SttEngine;
  active: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  notice?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <form action={setSttEngineAction}>
      <input type="hidden" name="engine" value={value} />
      <button
        type="submit"
        disabled={pending || active || disabled}
        aria-pressed={active}
        className={`h-full w-full cursor-pointer rounded-xl border p-4 text-left transition-colors disabled:cursor-default ${
          active ? "border-amber/50 bg-amber/10" : "border-seam hover:border-amber/40 hover:bg-amber/[0.05]"
        } ${disabled && !active ? "opacity-50" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-paper">{title}</p>
          {pending ? <Loader2 className="size-3.5 animate-spin text-fog" /> : null}
        </div>
        <p className="mt-1 text-xs text-fog">{description}</p>
        {notice ? <p className="mt-2 text-[0.7rem] leading-snug text-amber/80">{notice}</p> : null}
      </button>
    </form>
  );
}

/** Voice-note dictation engine — see useDictation for why this exists: Dhaga
 *  Voice (Moonshine) streams on-device and learns taught names, but needs
 *  WebGPU to run live and degrades to the browser engine without it; the
 *  browser's Web Speech API is free but unsupported on Firefox and silently
 *  broken on Brave/vanilla Chromium; on-device Whisper works everywhere at the
 *  cost of a one-time model download; the real-time Whisper variant needs WebGPU. */
export function VoiceInputSetting({ engine }: { engine: SttEngine }) {
  // isWebGpuAvailable() actually probes for a usable adapter, so it's async and
  // runs post-mount. null = still probing (server render + first client render
  // agree on null → no hydration mismatch).
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    isWebGpuAvailable().then((ok) => {
      if (!cancelled) setWebgpu(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const modelLoad = useSyncExternalStore(subscribeModelLoad, getModelLoadState, getModelLoadServerState);
  return (
    <div id="voice-dictation" className="scroll-mt-20 space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Voice dictation</p>
        <p className="mt-1 text-sm text-fog">
          How voice notes and voice search get transcribed. Every option keeps
          every word on your device — none ever uploads audio.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <EngineOption
          value="moonshine"
          active={engine === "moonshine"}
          title="Dhaga Voice (default)"
          description="On-device speech that streams live while you talk and learns the names you teach it below."
          notice={
            webgpu === false
              ? "Real-time voice needs WebGPU. On this browser or device it falls back to a slower, lighter engine — it works best on Chrome or Edge with a supported GPU."
              : undefined
          }
        />
        <EngineOption
          value="browser"
          active={engine === "browser"}
          title="Browser"
          description="Free, instant, no download. Works in Chrome, Edge, and Safari. Not available in Firefox; unreliable in Brave and Chromium."
        />
        <EngineOption
          value="local"
          active={engine === "local"}
          title="On-device Whisper"
          description="Downloads a small speech model once (~40MB), then works offline in every browser, including Firefox and Brave."
        />
        <EngineOption
          value="realtime"
          active={engine === "realtime"}
          disabled={webgpu !== true}
          title="Real-time Whisper (WebGPU)"
          description={
            webgpu === true
              ? "Same on-device Whisper model, but text updates live while you talk instead of after you stop."
              : "Needs a WebGPU-capable browser (Chrome or Edge) — unavailable here."
          }
        />
      </div>
      {engine === "local" || engine === "realtime" ? <ModelLoadStatus state={modelLoad} /> : null}
    </div>
  );
}
