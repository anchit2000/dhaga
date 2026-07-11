import {
  NOTE_EXTRACTION_SYSTEM,
  buildNoteExtractionPrompt,
  getLLMClient,
  hasLLM,
  noteExtractionSchema,
  type NoteExtraction,
} from "@dhaga/core";
import { applyExtraction } from "@/lib/repo/graph";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface NoteExtractionOutcome {
  applied: boolean;
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
): Promise<NoteExtractionOutcome> {
  if (!hasLLM()) {
    return {
      applied: false,
      factCount: 0,
      followUpCount: 0,
      notice:
        "Note saved. Set ANTHROPIC_API_KEY to extract facts from notes automatically.",
    };
  }
  let extraction: NoteExtraction;
  try {
    await assertAiBudget(userId);
    const result = await getLLMClient().extract({
      schema: noteExtractionSchema,
      system: NOTE_EXTRACTION_SYSTEM,
      prompt: buildNoteExtractionPrompt(contactName, noteBody),
      tier: "extract",
    });
    await recordAiAction("note_extraction", result.model, result.usage);
    extraction = result.data;
  } catch (error) {
    const reason =
      error instanceof AiBudgetError ? error.message : "The AI call failed.";
    return {
      applied: false,
      factCount: 0,
      followUpCount: 0,
      notice: `Note saved, but facts were not extracted: ${reason}`,
    };
  }

  // Separate try/catch: a failure here means the AI call succeeded and the
  // graph write is what broke — saying "the AI call failed" would blame the
  // wrong layer and mislead anyone debugging it.
  try {
    await applyExtraction(contactId, noteId, extraction);
  } catch {
    return {
      applied: false,
      factCount: 0,
      followUpCount: 0,
      notice:
        "Note saved, and facts were extracted, but saving them to the graph failed.",
    };
  }
  return {
    applied: true,
    factCount: extraction.facts.length + extraction.relationships.length,
    followUpCount: extraction.follow_ups.length,
  };
}
