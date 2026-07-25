/**
 * The module-level "Dhaga Voice" (Moonshine) runtime singleton and its vocab
 * teaching entry point. Split out of index.ts (the React hooks) to keep both
 * files under the 150-line rule; index.ts re-exports so `@/lib/voice/use-voice-
 * session` stays one import path.
 *
 * The engine + VoiceSession are a MODULE-LEVEL singleton so the model loads
 * once and every surface shares one WebGPU context; a single active-sink slot
 * routes events to whichever surface is recording.
 */
import { VoiceSession } from "@dhaga/core/src/voice/session";
import { DoubleMetaphoneDictionary } from "@dhaga/core/src/voice/teaching/phonetic";
import { HeuristicEditWatcher } from "@dhaga/core/src/voice/teaching/edit-watcher";
import { NoopCorrectionEngine } from "@dhaga/core/src/voice/correction/noop";
import type { SessionEvent } from "@dhaga/core/src/voice/types";
import { MoonshineAsrEngine } from "@/lib/voice/moonshine";
import { createMic, type Mic } from "@/lib/voice/mic";
import { DbVocabStore } from "@/lib/voice/db-vocab-store";

let sharedEngine: MoonshineAsrEngine | null = null;
let sharedSession: VoiceSession | null = null;
let sharedMic: Mic | null = null;
let activeSink: ((event: SessionEvent) => void) | null = null;

export function ensureRuntime(): { engine: MoonshineAsrEngine; session: VoiceSession; mic: Mic } {
  if (!sharedEngine || !sharedSession || !sharedMic) {
    sharedEngine = new MoonshineAsrEngine();
    sharedSession = new VoiceSession({
      asr: sharedEngine,
      dict: new DoubleMetaphoneDictionary(),
      correction: new NoopCorrectionEngine(),
      store: new DbVocabStore(),
      watcher: new HeuristicEditWatcher(),
      // Delegate to whichever surface is recording; dropped when none is.
      sink: (event) => activeSink?.(event),
    });
    sharedMic = createMic((frame) => sharedSession?.pushFrame(frame));
  }
  return { engine: sharedEngine, session: sharedSession, mic: sharedMic };
}

/** Route the singleton's events to a specific surface's handler. */
export function setActiveSink(sink: (event: SessionEvent) => void): void {
  // Hand-off guard: a different surface was recording and never stopped its mic
  // (e.g. its dialog closed without Stop). Stop the shared mic before switching
  // so the new surface builds a fresh pipeline instead of inheriting a stale one.
  if (activeSink && activeSink !== sink && sharedMic?.active) sharedMic.stop();
  activeSink = sink;
}

/** Release the mic + relinquish the sink if `sink` is the one currently active. */
export function releaseActiveSink(sink: (event: SessionEvent) => void): void {
  if (activeSink === sink) {
    sharedMic?.stop();
    activeSink = null;
  }
}

/**
 * Auto-learn a correction into the shared voice vocab: persist `term` (the
 * canonical spelling) with any observed mis-hearings as `aliases`, then rebuild
 * the phonetic index so that word is never mis-transcribed again. Exposed as a
 * standalone fn (not on DictationState) so review surfaces can teach without
 * every dictation consumer carrying teaching state. No-op — never throwing — if
 * the voice runtime hasn't been built yet (nothing dictated) or the API errors;
 * teaching is a best-effort enhancement and must not break the note flow.
 */
export async function teachVocab(term: string, aliases: string[] = []): Promise<void> {
  const canonical = term.trim();
  if (!canonical || !sharedSession) return;
  try {
    await sharedSession.teach(
      canonical,
      aliases.map((alias) => alias.trim()).filter(Boolean),
    );
  } catch (err) {
    console.warn("teachVocab failed; correction not persisted", err);
  }
}
