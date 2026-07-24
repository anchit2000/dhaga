/**
 * VoiceSession — the orchestrator. Wires the layers together and emits a
 * SessionEvent stream. Deliberately owns no timers, no DOM, no model code: it
 * depends only on the gateway interfaces, so every layer is swappable and the
 * whole thing is unit-testable with fakes.
 *
 *   pushFrame(frame)  → append audio, fire a throttled live partial
 *   endUtterance()    → finalize (accurate ASR) → phonetic teaching → correction
 *                       → emit final + edit_applied + learned
 *   teach(term)       → persist a taught term and re-index immediately
 */
import type { EventSink, Edit, PcmFrame, VocabTerm } from "../types";
import { todayLine } from "../../llm/prompts/today";
import type { SessionDeps } from "./deps";
import { PARTIAL_INTERVAL_SAMPLES } from "./deps";

export type { SessionDeps } from "./deps";
export { PARTIAL_INTERVAL_SAMPLES } from "./deps";

export class VoiceSession {
  private workingText = "";
  private vocab: VocabTerm[] = [];
  private samplesSincePartial = 0;
  private partialBusy = false;

  constructor(private readonly deps: SessionDeps) {}

  /** Load persisted vocab and prime the phonetic index. Call once after models load. */
  async init(): Promise<void> {
    this.vocab = await this.deps.store.load();
    this.deps.dict.rebuild(this.vocab);
  }

  get transcript(): string {
    return this.workingText;
  }

  private get preferredSpellings(): string[] {
    return this.vocab.map((t) => t.term);
  }

  /** Append a frame; fire a throttled live partial when enough audio has arrived. */
  pushFrame(frame: PcmFrame): void {
    this.deps.asr.pushFrame(frame);
    this.samplesSincePartial += frame.length;
    if (this.samplesSincePartial >= PARTIAL_INTERVAL_SAMPLES && !this.partialBusy) {
      this.samplesSincePartial = 0;
      void this.emitPartial();
    }
  }

  private async emitPartial(): Promise<void> {
    this.partialBusy = true;
    try {
      const text = await this.deps.asr.transcribePartial();
      // Emit the RAW ASR partial for maximum real-time responsiveness, and so the
      // live event stream reflects exactly what the recognizer produces (no
      // phonetic rewrite obscuring it). Teaching is applied on finalize.
      if (text) this.deps.sink({ type: "partial", text });
    } catch (err) {
      // Partials are best-effort; never surface a decode hiccup to the user.
      console.warn("partial decode failed", err);
    } finally {
      this.partialBusy = false;
    }
  }

  /**
   * Finalize the current utterance: accurate ASR → deterministic phonetic
   * teaching → correction. Emits final, edit_applied, and (if any) learned.
   */
  async endUtterance(): Promise<void> {
    this.deps.sink({ type: "status", stage: "refining" });
    const raw = (await this.deps.asr.finalize(this.preferredSpellings)).trim();
    if (!raw) return;

    // Layer 2 — deterministic phonetic teaching (instant, no tokens).
    const { text: taught, edits: phoneticEdits } = this.deps.dict.correct(raw);
    this.deps.sink({ type: "final", text: taught, raw });

    // Layer 3 — correction / self-edit / command intent. Only announce a
    // "correcting" stage when the engine is actually active — otherwise correct()
    // returns the instant deterministic result and there's no work to imply.
    if (this.deps.correction.isReady()) {
      this.deps.sink({ type: "status", stage: "correcting" });
    }
    let workingText = this.workingText ? `${this.workingText} ${taught}`.trim() : taught;
    let llmEdits: Edit[] = [];
    let learned: string[] = [];
    try {
      const result = await this.deps.correction.correct({
        workingText: this.workingText,
        utterance: taught,
        preferredSpellings: this.preferredSpellings,
        today: todayLine(),
      });
      workingText = result.workingText.trim();
      llmEdits = result.edits;
      learned = result.learnedTerms;
    } catch (err) {
      // Fail soft: keep the naive concatenation so speech is never lost (Rule 12).
      console.warn("correction failed, keeping raw concatenation", err);
    }

    this.workingText = workingText;
    const edits = [...phoneticEdits, ...llmEdits];
    this.deps.sink({ type: "edit_applied", workingText, edits });

    if (learned.length) await this.learnTerms(learned);
  }

  /** Explicitly teach a canonical spelling (from the teach panel or a vocab_add). */
  async teach(term: string, aliases: string[] = []): Promise<void> {
    const saved = await this.deps.store.upsert(term, aliases);
    this.mergeVocab(saved);
    this.deps.dict.rebuild(this.vocab);
    this.deps.sink({ type: "learned", terms: [term] });
  }

  /**
   * Learn from a manual edit the user made to committed text: derive candidate
   * canonical terms and persist the distinctive ones (Wispr-style auto-learn).
   */
  async learnFromEdit(before: string, after: string): Promise<void> {
    const terms = this.deps.watcher.candidates(before, after);
    if (terms.length) await this.learnTerms(terms);
  }

  private async learnTerms(terms: string[]): Promise<void> {
    for (const term of terms) {
      const saved = await this.deps.store.upsert(term);
      this.mergeVocab(saved);
    }
    this.deps.dict.rebuild(this.vocab);
    this.deps.sink({ type: "learned", terms });
  }

  private mergeVocab(saved: VocabTerm): void {
    const i = this.vocab.findIndex((t) => t.term.toLowerCase() === saved.term.toLowerCase());
    if (i >= 0) this.vocab[i] = saved;
    else this.vocab.push(saved);
  }

  /** Reset the running transcript (new note), keeping learned vocab. */
  resetTranscript(): void {
    this.workingText = "";
    this.deps.asr.reset();
  }
}
