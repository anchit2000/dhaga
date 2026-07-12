import {
  CONTACT_PARSE_SYSTEM,
  buildContactParsePrompt,
  extractedContactSchema,
  getLLMClient,
  hasLLM,
  heuristicContactParse,
  type ExtractedContact,
} from "@dhaga/core";
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
    await assertAiBudget(userId);
    const result = await getLLMClient().extract({
      schema: extractedContactSchema,
      system: CONTACT_PARSE_SYSTEM,
      prompt: buildContactParsePrompt(rawText),
      tier: "extract",
    });
    await recordAiAction("contact_parse", result.model, result.usage);
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
