import {
  CARD_SCAN_PROMPT,
  CARD_SCAN_SYSTEM,
  cardReceiptText,
  cardScanSchema,
  getLLMClient,
  hasLLM,
  type ExtractedContact,
  type LLMImage,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { isTransientConnectionError } from "@/utils/constants/db";
import {
  AiBudgetError,
  assertAiBudget,
  currentAiActionId,
  recordAiAction,
  withAiAction,
} from "./metering";

export interface CardScanResult {
  contact?: ExtractedContact;
  rawText?: string;
  error?: string;
  /** The scan's AI action id. One scan is ONE metered action, but its verbatim
   *  transcription runs later, in the save request — pass this id back so that
   *  second model call folds into this action instead of billing a second one
   *  (see scheduleCardTranscription). */
  actionId?: string;
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
  // One scan = one metered action, however many model calls it takes.
  return withAiAction("card_scan", () => runScan(userId, images));
}

async function runScan(userId: string, images: LLMImage[]): Promise<CardScanResult> {
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
    // The vision call already succeeded (and was billed) — a transient blip in
    // the usage-record must NOT discard the contact. Record best-effort: on
    // failure log PII-free and keep the scan. An occasional unmetered action is
    // harmless next to losing a good scan the user waited seconds for.
    try {
      await withUserDb(userId, () =>
        recordAiAction("card_scan", result.model, result.usage),
      );
    } catch (recordError) {
      console.error("[card-scan] usage record failed (scan kept)", {
        name: recordError instanceof Error ? recordError.name : typeof recordError,
        code: (recordError as { code?: unknown } | null)?.code,
        transient: isTransientConnectionError(recordError),
      });
    }
    const contact = result.data;
    if (!contact.name.trim()) {
      return {
        error:
          "Couldn't read a person off that photo — try a sharper, closer shot.",
      };
    }
    return {
      contact,
      rawText: cardReceiptText(contact),
      actionId: currentAiActionId() ?? undefined,
    };
  } catch (error) {
    if (!(error instanceof AiBudgetError)) {
      // The scan collapsed into an opaque "try again"; without this it left no
      // trace, so a real failure (LLM API error, or a transient Sydney pool
      // blip in the budget check / usage-record around the vision call) was a
      // black box. PII-safe — error class / code / HTTP status / transient flag
      // and the image count only, never the message body which could echo card
      // content (mirrors the [ask-dhaga] failure log; privacy rule).
      console.error("[card-scan] extraction failed", {
        name: error instanceof Error ? error.name : typeof error,
        code: (error as { code?: unknown } | null)?.code,
        status: (error as { status?: unknown } | null)?.status,
        transient: isTransientConnectionError(error),
        imageCount: images.length,
      });
    }
    return {
      error:
        error instanceof AiBudgetError ? error.message : "The scan failed — try again.",
    };
  }
}
