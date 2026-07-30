import {
  CAPTURE_EXTRACTION_SYSTEM,
  buildContactParsePrompt,
  captureExtractionSchema,
  emptyCaptureClassification,
  getLLMClient,
  hasLLM,
  heuristicContactParse,
  type CaptureClassification,
  type ExtractedContact,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { userToday } from "@/lib/repo/reminders/local-today";
import { AiBudgetError, assertAiBudget, recordAiAction, withAiAction } from "./metering";

export interface ContactExtractionResult {
  contact: ExtractedContact;
  /** Folded into the SAME extraction call (one AI action, metered as
   *  `contact_parse`): whether the capture reads as a note about a person, plus
   *  the subject name + note body the note-capture router needs. Neutral (not a
   *  note) on the offline/no-AI paths, which cannot classify. */
  classification: CaptureClassification;
  via: "ai" | "heuristic";
  notice?: string;
}

/**
 * Text → contact. Cloud AI when configured and within budget; otherwise the
 * offline heuristic parser — the feature always works, and the user is told
 * which path ran. Never logs the captured text (contact PII).
 *
 * The AI path ALSO classifies whether the text is a note about a person, in the
 * one structured output — so the note-capture flow needs no second round-trip or
 * second metered action. The heuristic path can't classify, so it returns the
 * neutral "not a note" classification and capture falls through to contact-add.
 */
export async function extractContactFromText(
  userId: string,
  rawText: string,
): Promise<ContactExtractionResult> {
  if (process.env.CONTACT_PARSE_STRATEGY === "heuristic" || !hasLLM()) {
    return {
      contact: heuristicContactParse(rawText),
      classification: emptyCaptureClassification(),
      via: "heuristic",
      notice:
        "Parsed offline (no cloud AI configured). Review the fields carefully.",
    };
  }
  // One capture = one metered action, whatever it takes to parse.
  return withAiAction("contact_parse", () => parseWithAi(userId, rawText));
}

async function parseWithAi(
  userId: string,
  rawText: string,
): Promise<ContactExtractionResult> {
  try {
    // Budget check and usage-record each in their OWN short scope, released
    // before/after the LLM call, so no tenant connection is held across the
    // multi-second Anthropic round-trip (GOAL 1b / SCALING.md lever 2). Left
    // unscoped in a server action, these getDb()-acquiring calls pin the
    // request-scoped connection across the whole extract() — the #92 pool bug.
    // The user's calendar day rides in this same pre-LLM scope, sequentially
    // after the budget check — "next Tuesday" in a capture resolves against the
    // user's day, not the server's UTC one — so it costs no extra connection
    // and, like the budget read, is released before the model call.
    const today = await withUserDb(userId, async () => {
      await assertAiBudget(userId);
      return userToday();
    });
    const result = await getLLMClient().extract({
      schema: captureExtractionSchema,
      system: CAPTURE_EXTRACTION_SYSTEM,
      prompt: buildContactParsePrompt(rawText, today),
      tier: "extract",
    });
    await withUserDb(userId, () =>
      recordAiAction("contact_parse", result.model, result.usage),
    );
    const { isNoteAboutPerson, subjectName, noteBody, ...contact } = result.data;
    return {
      contact,
      classification: { isNoteAboutPerson, subjectName, noteBody },
      via: "ai",
    };
  } catch (error) {
    const reason =
      error instanceof AiBudgetError
        ? error.message
        : "The AI call failed.";
    return {
      contact: heuristicContactParse(rawText),
      classification: emptyCaptureClassification(),
      via: "heuristic",
      notice: `${reason} Parsed offline instead — review the fields carefully.`,
    };
  }
}
