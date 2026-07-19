import {
  ENRICHMENT_EXTRACTION_SYSTEM,
  NOTE_EXTRACTION_SYSTEM,
  buildEnrichmentExtractionPrompt,
  buildNoteExtractionPrompt,
  getLLMClient,
  hasLLM,
  noteExtractionSchema,
  type LLMUsage,
  type NoteExtraction,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { applyExtraction } from "@/lib/repo/graph";
import { listNodeTypes } from "@/lib/repo/node-types";
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
  let model: string;
  let usage: LLMUsage;
  try {
    // Prep phase (DB): budget check + node-type registry read run inside a
    // short scoped-db lifetime, then the connection is released BEFORE the LLM
    // call — see the extraction worker's connection-lifecycle fix. The user's
    // node-type registry (names + slugs only, never entity rows) rides in the
    // volatile user prompt so the cached system prefix stays byte-stable; an
    // empty registry degrades to the registry-free prompt.
    const nodeTypes = await withUserDb(userId, async () => {
      await assertAiBudget(userId);
      return (await listNodeTypes()).map(({ name, slug }) => ({ name, slug }));
    });
    // LLM phase: no DB connection is held across this ~minute-long call.
    const result = await getLLMClient().extract({
      schema: noteExtractionSchema,
      system: enrichment ? ENRICHMENT_EXTRACTION_SYSTEM : NOTE_EXTRACTION_SYSTEM,
      prompt: enrichment
        ? buildEnrichmentExtractionPrompt(contactName, noteBody, nodeTypes)
        : buildNoteExtractionPrompt(contactName, noteBody, nodeTypes),
      tier: "extract",
    });
    extraction = result.data;
    model = result.model;
    usage = result.usage;
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

  // Apply phase (DB): a fresh short-lived scope records usage and writes the
  // graph. Separate try/catch: a failure here means the AI call succeeded and
  // the DB write is what broke — saying "the AI call failed" would blame the
  // wrong layer and mislead anyone debugging it.
  try {
    await withUserDb(userId, async () => {
      await recordAiAction("note_extraction", model, usage);
      await applyExtraction(contactId, noteId, extraction, { unverified: enrichment });
    });
  } catch (error) {
    // Log server-side so a recurring graph-write failure is diagnosable —
    // but ONLY the error's own metadata, never the note text, extraction
    // output, or any contact PII (CLAUDE.md privacy rules).
    console.error("note-extraction: graph write failed", {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
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
