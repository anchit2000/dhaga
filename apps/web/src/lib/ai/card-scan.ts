import {
  CARD_SCAN_PROMPT,
  CARD_SCAN_SYSTEM,
  cardScanSchema,
  getLLMClient,
  hasLLM,
  type ExtractedContact,
  type LLMImage,
} from "@dhaga/core";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface CardScanResult {
  contact?: ExtractedContact;
  rawText?: string;
  error?: string;
}

/**
 * Card/badge photo → contact via the vision model (M1 server path).
 * No offline fallback exists for images, so failures are explicit.
 * Scanning never stores anything — callers persist the photo (visual
 * receipt) only when the store-card-photos setting allows it.
 */
export async function scanCardImage(
  userId: string,
  image: LLMImage,
): Promise<CardScanResult> {
  if (!hasLLM()) {
    return { error: "Card scanning needs cloud AI — set ANTHROPIC_API_KEY." };
  }
  try {
    await assertAiBudget(userId);
    const result = await getLLMClient().extract({
      schema: cardScanSchema,
      system: CARD_SCAN_SYSTEM,
      prompt: CARD_SCAN_PROMPT,
      tier: "extract",
      images: [image],
    });
    await recordAiAction("contact_parse", result.model, result.usage);
    const { raw_text, ...contact } = result.data;
    if (!contact.name.trim()) {
      return {
        error:
          "Couldn't read a person off that photo — try a sharper, closer shot.",
      };
    }
    return { contact, rawText: raw_text };
  } catch (error) {
    return {
      error:
        error instanceof AiBudgetError ? error.message : "The scan failed — try again.",
    };
  }
}
