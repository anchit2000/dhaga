import {
  NOTE_EXTRACTION_SYSTEM,
  buildNoteExtractionPrompt,
  getLLMClient,
  hasLLM,
  noteExtractionSchema,
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
  try {
    await assertAiBudget();
    const result = await getLLMClient().extract({
      schema: noteExtractionSchema,
      system: NOTE_EXTRACTION_SYSTEM,
      prompt: buildNoteExtractionPrompt(contactName, noteBody),
      tier: "extract",
    });
    await recordAiAction("note_extraction", result.model, result.usage);
    await applyExtraction(contactId, noteId, result.data);
    return {
      applied: true,
      factCount: result.data.facts.length + result.data.relationships.length,
      followUpCount: result.data.follow_ups.length,
    };
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
}
