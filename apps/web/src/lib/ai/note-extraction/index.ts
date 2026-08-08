import {
  ENRICHMENT_EXTRACTION_SYSTEM,
  NOTE_EXTRACTION_SYSTEM,
  buildEnrichmentExtractionPrompt,
  buildNoteExtractionPrompt,
  getLLMClient,
  hasLLM,
  noteExtractionSchema,
  type LLMUsage,
  type CalendarDay,
  type NoteExtraction,
} from "@dhaga/core";
import { errorFields } from "@dhaga/core/src/logging";
import { withUserDb } from "@/lib/db/request-scope";
import { scheduleCalendarWriteOutForNote } from "@/lib/calendar/write-out";
import { createEnrichmentMatchConfirmation } from "@/lib/repo/confirmations";
import { applyExtraction } from "@/lib/repo/graph";
import { recordAiAction, withAiAction } from "../metering";
import { prepareNoteExtraction } from "./prep";
import {
  graphWriteFailedOutcome,
  mapExtractionError,
  noLlmOutcome,
  type ExtractionMode,
  type NoteExtractionOutcome,
} from "./outcome";

export type { ExtractionMode, NoteExtractionOutcome } from "./outcome";

/**
 * Note → facts/edges/follow-ups, written with the note id as receipt.
 * The note itself is always saved by the caller first — extraction failing
 * never loses the user's words.
 *
 * Processing ONE note is one metered action, whatever that note ends up
 * triggering. When this runs inside a bigger action — enrichment wraps a web
 * search plus this extraction — `withAiAction` joins the open action instead of
 * starting a second one, so the user is charged for the enrichment they asked
 * for, once.
 */
export function extractAndApplyNote(
  userId: string,
  contactId: string,
  noteId: string,
  contactName: string,
  noteBody: string,
  mode: ExtractionMode = "note",
): Promise<NoteExtractionOutcome> {
  return withAiAction("note_extraction", () =>
    runNoteExtraction(userId, contactId, noteId, contactName, noteBody, mode),
  );
}

async function runNoteExtraction(
  userId: string,
  contactId: string,
  noteId: string,
  contactName: string,
  noteBody: string,
  mode: ExtractionMode,
): Promise<NoteExtractionOutcome> {
  if (!hasLLM()) {
    return noLlmOutcome();
  }
  const enrichment = mode === "enrichment";
  let extraction: NoteExtraction;
  let model: string;
  let usage: LLMUsage;
  let today: CalendarDay;
  try {
    // Prep phase (DB): one short scoped-db lifetime, released BEFORE the LLM
    // call (see ./prep). The registry and the day both ride in the VOLATILE
    // user prompt, so the cached system prefix stays byte-stable.
    const prep = await prepareNoteExtraction(userId);
    const { nodeTypes } = prep;
    today = prep.today;
    // LLM phase: no DB connection is held across this ~minute-long call.
    const result = await getLLMClient().extract({
      schema: noteExtractionSchema,
      system: enrichment ? ENRICHMENT_EXTRACTION_SYSTEM : NOTE_EXTRACTION_SYSTEM,
      prompt: enrichment
        ? buildEnrichmentExtractionPrompt(contactName, noteBody, nodeTypes, today)
        : buildNoteExtractionPrompt(contactName, noteBody, nodeTypes, today),
      tier: "extract",
    });
    extraction = result.data;
    model = result.model;
    usage = result.usage;
  } catch (error) {
    return mapExtractionError(error);
  }

  // Apply phase (DB): a fresh short-lived scope records usage and writes the
  // graph. Separate try/catch: a failure here means the AI call succeeded and
  // the DB write is what broke — saying "the AI call failed" would blame the
  // wrong layer and mislead anyone debugging it.
  try {
    await withUserDb(userId, async () => {
      await recordAiAction("note_extraction", model, usage);
      const { factIds } = await applyExtraction(contactId, noteId, extraction, {
        unverified: enrichment,
        today,
      });
      // Enrichment writes facts unverified (kept as-is) AND raises one
      // enrichment_match confirmation per fact — web findings can be the wrong
      // person, so each stays badged until the user confirms or deletes it
      // (dismiss deletes the fact). Note facts are trusted and never gated.
      // The user triggered enrichment on THIS contact, so identity is known —
      // the question asks about the detail's correctness and the detail itself
      // rides in `options` (factIds is 1:1, same order as extraction.facts —
      // see applyExtraction) so the card shows what it's asking about.
      if (enrichment) {
        for (let i = 0; i < factIds.length; i++) {
          const factId = factIds[i];
          const fact = extraction.facts[i];
          await createEnrichmentMatchConfirmation({
            factId,
            contactId,
            question: `Does this detail check out for ${contactName}?`,
            options: [{ id: factId, label: fact.text, sublabel: fact.type }],
            sourceNoteId: noteId,
          });
        }
      }
    });
  } catch (error) {
    // Log server-side so a recurring graph-write failure is diagnosable, in the
    // PII-safe shape from @dhaga/core/src/logging: `name` and driver `code` always,
    // `message` ONLY for TypeError/ReferenceError (engine-generated, so it names
    // identifiers rather than the values they held), and `at` — stack FRAMES, code
    // locations — instead of the raw stack. That restriction is the whole point
    // here: the block above INSERTs extracted fact text and follow-up bodies, so a
    // constraint violation's message quotes that content straight back into the log
    // — the PII this must never record. Counts are SIZE, never content, so they stay.
    console.error("note-extraction: graph write failed", {
      ...errorFields(error),
      factCount: extraction.facts.length,
      relationshipCount: extraction.relationships.length,
      followUpCount: extraction.follow_ups.length,
    });
    return graphWriteFailedOutcome();
  }
  // Extraction is where most follow-ups are born, so they have to reach a
  // write-enabled calendar too. After the response, outside the scope above:
  // applyExtraction hands back only fact ids, so the sync re-reads this note's
  // follow-ups itself (lib/calendar/write-out.ts).
  scheduleCalendarWriteOutForNote(userId, noteId);
  return {
    applied: true,
    failed: false,
    factCount: extraction.facts.length + extraction.relationships.length,
    followUpCount: extraction.follow_ups.length,
  };
}
