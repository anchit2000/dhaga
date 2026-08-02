import { Mic, Square } from "lucide-react";
import type { ReactElement } from "react";

import { VOICE_PREVIEW } from "./fixtures";

export function VoicePane(): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <div className="rounded-xl border border-seam bg-panel p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base text-paper">Add note</p>
            <p className="mt-0.5 text-[10px] text-fog">Rohan Mehta</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/50 px-3 py-1.5 text-[10px] text-destructive">
            <Square className="size-3" aria-hidden /> Listening — tap to stop
          </span>
        </div>
        <div className="mt-3 min-h-24 rounded-lg border border-line bg-well p-3 text-[11px] leading-5 text-paper">
          {VOICE_PREVIEW.transcript}
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-amber align-middle" />
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-fog">
          Tap a word to fix it — Dhaga learns the spelling
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {VOICE_PREVIEW.transcript.split(" ").slice(0, 8).map((word, index) => (
            <span key={`${word}-${index}`} className="rounded-md border border-seam px-1.5 py-1 text-[9px] text-paper">
              {word}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-seam pt-3">
          <span className="rounded-full bg-amber px-3 py-1.5 text-[10px] font-semibold text-on-accent">Add note</span>
          <span className="inline-flex items-center gap-1 text-[9px] text-fog">
            <Mic className="size-3" aria-hidden /> On-device dictation
          </span>
        </div>
      </div>
    </div>
  );
}
