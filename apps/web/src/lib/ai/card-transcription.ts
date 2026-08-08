import "server-only";
import { after } from "next/server";
import {
  CARD_TRANSCRIPTION_PROMPT,
  CARD_TRANSCRIPTION_SYSTEM,
  cardTranscriptionSchema,
  getLLMClient,
  hasLLM,
  type LLMImage,
} from "@dhaga/core";
import { errorFields } from "@dhaga/core/src/logging";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { replaceNoteBody } from "@/lib/repo/notes";
import { isTransientConnectionError } from "@/utils/constants/db";
import { AiBudgetError, assertAiBudget, recordAiAction, withAiAction } from "./metering";

/**
 * The card's verbatim text, fetched on its own AFTER the response is sent.
 *
 * The scan itself asks for fields only, because a transcription in that same
 * call tripled its output tokens and put the user-facing round trip at ~6s
 * (see cardReceiptText). Doing it here costs the user nothing: the contact is
 * already saved and on screen. The receipt note is created at save time from
 * the extracted fields, and this replaces its body with the real card text a
 * few seconds later — so office addresses, taglines, and any other line that
 * maps to no field become searchable again.
 */
export async function transcribeCardImages(
  userId: string,
  images: LLMImage[],
  actionId?: string,
): Promise<string | null> {
  if (!hasLLM() || images.length === 0) return null;
  // NOT a second action: the scan handed its action id across the request
  // boundary, so this call folds into that one scan and the user is charged one
  // credit for the whole thing. Without an id (a caller that scanned and saved
  // in one request, or an older client) it opens its own card_scan action
  // rather than going unmetered.
  return withAiAction(
    actionId ? { feature: "card_scan", id: actionId } : "card_scan",
    () => runTranscription(userId, images),
  );
}

async function runTranscription(userId: string, images: LLMImage[]): Promise<string | null> {
  // Budget is checked in its own short scope before the model call, exactly as
  // the scan does — an out-of-credit user gets the field-derived receipt and no
  // charge, not a failed save. Rejoining the scan's action means the cap does
  // not refuse this call for a user who was admitted at scan time.
  await withUserDb(userId, () => assertAiBudget(userId));
  const result = await getLLMClient().extract({
    schema: cardTranscriptionSchema,
    system: CARD_TRANSCRIPTION_SYSTEM,
    prompt: CARD_TRANSCRIPTION_PROMPT,
    tier: "extract",
    images,
  });
  try {
    await withUserDb(userId, () =>
      recordAiAction("card_scan", result.model, result.usage),
    );
  } catch (error) {
    // Same trade as the scan: the call is already billed upstream, so a blip
    // recording it must not discard the transcription. logActionError alone said
    // only that "a write failed" — it never named the spend, and this one is
    // invisible twice over: it folds into the SCAN's action, so an operator
    // reading `ai_actions` sees a card_scan row whose tokens are quietly short
    // rather than a row that is missing. These are the counts to reconcile
    // against the provider bill; the card's text never appears here.
    console.error("[card-transcription] usage record failed (transcription kept)", {
      feature: "card_scan",
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      ...errorFields(error),
      transient: isTransientConnectionError(error),
    });
  }
  const text = result.data.raw_text.trim();
  return text || null;
}

/**
 * Schedule the transcription and fold it into the receipt note, after the
 * response is sent. Mirrors scheduleCalendarWriteOut: the work makes an
 * outbound LLM call, so it must not run inside the save's tenant connection,
 * and a transcription that fails must never fail the save the user just made.
 *
 * Failure is survivable by design — the note already holds the field-derived
 * receipt, so the worst case is a less searchable note, not a missing one.
 */
export function scheduleCardTranscription(
  userId: string,
  contactId: string,
  noteId: string,
  images: LLMImage[],
  actionId?: string,
): void {
  if (!noteId || images.length === 0) return;
  try {
    after(async () => {
      try {
        const text = await transcribeCardImages(userId, images, actionId);
        if (!text) return;
        await withUserDb(userId, async () => {
          await replaceNoteBody(noteId, text);
          await upsertEmbedding("note", noteId, contactId, text);
        });
      } catch (error) {
        // An out-of-credit user is an expected outcome here, not a fault.
        if (error instanceof AiBudgetError) return;
        logActionError("cardTranscription", error);
      }
    });
  } catch {
    // after() throws outside a request scope — the vitest suite calls these
    // actions directly with no HTTP request in play. Skip the write-out there
    // rather than failing the save (same as scheduleCalendarWriteOut).
  }
}
