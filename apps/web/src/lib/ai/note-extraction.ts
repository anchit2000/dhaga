import {
  ENRICHMENT_EXTRACTION_SYSTEM,
  NOTE_EXTRACTION_SYSTEM,
  buildEnrichmentExtractionPrompt,
  buildNoteExtractionPrompt,
  getLLMClient,
  hasLLM,
  noteExtractionSchema,
  type NoteExtraction,
} from "@dhaga/core";
import { applyExtraction } from "@/lib/repo/graph";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

/** "note": the user's own words (trusted). "enrichment": public-web findings
 *  (extracted broadly, then written unverified for the user to confirm). */
export type ExtractionMode = "note" | "enrichment";

export interface NoteExtractionOutcome {
  applied: boolean;
  /** True only when extraction genuinely errored (AI call or graph write) —
   *  distinct from "ran fine, found nothing" and from "no LLM configured".
   *  The background worker marks the job errored (and retryable) on this. */
  failed: boolean;
  factCount: number;
  followUpCount: number;
  notice?: string;
}

/**
 * Note → facts/edges/follow-ups, written with the note id as receipt.
 * The note itself is always saved by the caller first — extraction failing
 * never loses the user's words.
 */
export async function extractAndApplyNote(
  userId: string,
  contactId: string,
  noteId: string,
  contactName: string,
  noteBody: string,
  mode: ExtractionMode = "note",
): Promise<NoteExtractionOutcome> {
  if (!hasLLM()) {
    return {
      applied: false,
      failed: false,
      factCount: 0,
      followUpCount: 0,
      notice:
        "Note saved. Configure an LLM provider to extract facts automatically.",
    };
  }
  const enrichment = mode === "enrichment";
  let extraction: NoteExtraction;
  try {
    await assertAiBudget(userId);
    const result = await getLLMClient().extract({
      schema: noteExtractionSchema,
      system: enrichment ? ENRICHMENT_EXTRACTION_SYSTEM : NOTE_EXTRACTION_SYSTEM,
      prompt: enrichment
        ? buildEnrichmentExtractionPrompt(contactName, noteBody)
        : buildNoteExtractionPrompt(contactName, noteBody),
      tier: "extract",
    });
    await recordAiAction("note_extraction", result.model, result.usage);
    extraction = result.data;
  } catch (error) {
    const reason =
      error instanceof AiBudgetError ? error.message : "The AI call failed.";
    return {
      applied: false,
      failed: true,
      factCount: 0,
      followUpCount: 0,
      notice: `Facts were not extracted: ${reason}`,
    };
  }

  // Separate try/catch: a failure here means the AI call succeeded and the
  // graph write is what broke — saying "the AI call failed" would blame the
  // wrong layer and mislead anyone debugging it.
  try {
    await applyExtraction(contactId, noteId, extraction, { unverified: enrichment });
  } catch {
    return {
      applied: false,
      failed: true,
      factCount: 0,
      followUpCount: 0,
      notice: "Facts were extracted, but saving them to the graph failed.",
    };
  }
  return {
    applied: true,
    failed: false,
    factCount: extraction.facts.length + extraction.relationships.length,
    followUpCount: extraction.follow_ups.length,
  };
}
