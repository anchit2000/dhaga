/**
 * VoiceSession wiring inputs: the dependency-injection contract (SessionDeps) and
 * the one cadence constant that governs how often a live partial fires. Split out
 * of index.ts to keep the orchestrator file under the 150-line rule; index.ts
 * re-exports these so `voice/session` stays a single import path.
 */
import type { AsrEngine } from "../asr/types";
import type { CorrectionEngine } from "../correction/types";
import type { PhoneticDictionary, VocabStore, EditWatcher } from "../teaching/types";
import type { EventSink } from "../types";
import { SAMPLE_RATE } from "../types";

/** How much new audio (samples) to accumulate before running a live partial. */
export const PARTIAL_INTERVAL_SAMPLES = Math.round(SAMPLE_RATE * 0.35); // ~350 ms

export interface SessionDeps {
  asr: AsrEngine;
  dict: PhoneticDictionary;
  correction: CorrectionEngine;
  store: VocabStore;
  watcher: EditWatcher;
  sink: EventSink;
}
