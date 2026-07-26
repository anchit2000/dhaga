import {
  CARD_SCAN_PROMPT,
  CARD_SCAN_SYSTEM,
  cardScanSchema,
  getLLMClient,
  hasLLM,
  type ExtractedContact,
  type LLMImage,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface CardScanResult {
  contact?: ExtractedContact;
  rawText?: string;
  error?: string;
}

/**
 * Card/badge photos → ONE contact via the vision model (M1 server path).
 * Several photos of the same card (front+back, leaflet pages) merge into a
 * single contact and a combined raw_text. No offline fallback exists for
 * images, so failures are explicit. Scanning never stores anything — callers
 * persist the photos (visual receipts) only when the store-card-photos
 * setting allows it.
 */
export async function scanCardImages(
  userId: string,
  images: LLMImage[],
): Promise<CardScanResult> {
  if (!hasLLM()) {
    return { error: "Card scanning needs a configured cloud LLM provider." };
  }
  if (images.length === 0) {
    return { error: "Add at least one card photo to scan." };
  }
  try {
    // Budget check and usage-record each in their OWN short scope, released
    // before/after the vision call, so no tenant connection is held across the
    // multi-second Anthropic round-trip (GOAL 1b / SCALING.md lever 2). Left
    // unscoped in a server action, these getDb()-acquiring calls pin the
    // request-scoped connection across the whole extract() — the #92 pool bug.
    await withUserDb(userId, () => assertAiBudget(userId));
    const result = await getLLMClient().extract({
      schema: cardScanSchema,
      system: CARD_SCAN_SYSTEM,
      prompt: CARD_SCAN_PROMPT,
      tier: "extract",
      images,
    });
    await withUserDb(userId, () =>
      recordAiAction("contact_parse", result.model, result.usage),
    );
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
