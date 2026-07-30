import "server-only";
import {
  getLLMClient,
  hasLLM,
  photoNoteSchema,
  PHOTO_NOTE_PROMPT,
  PHOTO_NOTE_SYSTEM,
  type LLMImage,
} from "@dhaga/core";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { assertAiBudget, recordAiAction } from "./metering";

/**
 * Vision-transcribe photos captured as a note. Returns null when no LLM is
 * configured or nothing readable was found.
 *
 * Shaped exactly like transcribeCardImages (see card-transcription.ts): budget
 * checked in its own short DB scope BEFORE the model call, the model call held
 * outside any tenant connection, and the metering write in a second short scope
 * afterwards. A blip recording the action must not throw away a transcription
 * the user is already being charged for upstream, so that write is best-effort.
 *
 * Unlike the card path this runs INSIDE the request rather than after it: the
 * card already has a note (composed from its extracted fields) to fall back on,
 * whereas a photo note has no body at all until this returns, so the user has
 * to wait for it.
 *
 * `assertAiBudget`'s AiBudgetError deliberately propagates — a caller has to
 * decide whether "no AI budget" means an error or a caption-only note; it is
 * not this function's call to make.
 */
export async function transcribePhotoNote(
  userId: string,
  images: LLMImage[],
): Promise<string | null> {
  if (!hasLLM() || images.length === 0) return null;
  await withUserDb(userId, () => assertAiBudget(userId));
  const result = await getLLMClient().extract({
    schema: photoNoteSchema,
    system: PHOTO_NOTE_SYSTEM,
    prompt: PHOTO_NOTE_PROMPT,
    tier: "extract",
    images,
  });
  try {
    await withUserDb(userId, () =>
      recordAiAction("note_extraction", result.model, result.usage),
    );
  } catch (error) {
    logActionError("photoNote.record", error);
  }
  const text = result.data.text.trim();
  return text || null;
}
