import type { LLMImage } from "@dhaga/core";
import type { MessagingClient } from "@dhaga/core/src/messaging";
import { scanCardImages } from "@/lib/ai/card-scan";
import { transcribePhotoNote } from "@/lib/ai/photo-note";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import { resolveImageMediaType } from "../process-item/image-type";
import type { DerivedItem } from "./derive";

/**
 * A photo becomes text two ways, cheapest-useful first: the card scanner (a card
 * or badge yields its printed text), then a plain photo transcription (a
 * whiteboard, a noticeboard, a handwritten page). Either way the planner decides
 * WHO it is about — the scan is a reader here, not an attributor, which is the
 * change from the old walk where a successful scan silently seized the cursor.
 */
export async function deriveImage(
  userId: string,
  client: MessagingClient,
  base: { item: MessagingSessionItemRow; seq: number; kind: string },
  media: Parameters<MessagingClient["downloadMedia"]>[0],
  caption: string | null,
): Promise<DerivedItem | null> {
  const downloaded = await client.downloadMedia(media);
  const mediaType = resolveImageMediaType(downloaded.mimeType, downloaded.data);
  if (!mediaType) return null;
  const image: LLMImage = {
    mediaType,
    dataBase64: Buffer.from(downloaded.data).toString("base64"),
  };
  const scan = await scanCardImages(userId, [image]);
  const read = scan.contact ? scan.rawText?.trim() : (await transcribePhotoNote(userId, [image]))?.trim();
  if (!read) return null;
  const text = caption?.trim() ? `${read}\n\n${caption.trim()}` : read;
  return { ...base, text, image };
}
