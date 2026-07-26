import {
  CONTACT_PARSE_SYSTEM,
  buildContactParsePrompt,
  extractedContactSchema,
  getLLMClient,
  hasLLM,
  heuristicContactParse,
  type ExtractedContact,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface ContactExtractionResult {
  contact: ExtractedContact;
  via: "ai" | "heuristic";
  notice?: string;
}

/**
 * Text → contact. Cloud AI when configured and within budget; otherwise the
 * offline heuristic parser — the feature always works, and the user is told
 * which path ran. Never logs the captured text (contact PII).
 */
export async function extractContactFromText(
  userId: string,
  rawText: string,
): Promise<ContactExtractionResult> {
  if (process.env.CONTACT_PARSE_STRATEGY === "heuristic" || !hasLLM()) {
    return {
      contact: heuristicContactParse(rawText),
      via: "heuristic",
      notice:
        "Parsed offline (no cloud AI configured). Review the fields carefully.",
    };
  }
  try {
    // Budget check and usage-record each in their OWN short scope, released
    // before/after the LLM call, so no tenant connection is held across the
    // multi-second Anthropic round-trip (GOAL 1b / SCALING.md lever 2). Left
    // unscoped in a server action, these getDb()-acquiring calls pin the
    // request-scoped connection across the whole extract() — the #92 pool bug.
    await withUserDb(userId, () => assertAiBudget(userId));
    const result = await getLLMClient().extract({
      schema: extractedContactSchema,
      system: CONTACT_PARSE_SYSTEM,
      prompt: buildContactParsePrompt(rawText),
      tier: "extract",
    });
    await withUserDb(userId, () =>
      recordAiAction("contact_parse", result.model, result.usage),
    );
    return { contact: result.data, via: "ai" };
  } catch (error) {
    const reason =
      error instanceof AiBudgetError
        ? error.message
        : "The AI call failed.";
    return {
      contact: heuristicContactParse(rawText),
      via: "heuristic",
      notice: `${reason} Parsed offline instead — review the fields carefully.`,
    };
  }
}
