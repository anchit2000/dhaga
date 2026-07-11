import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { cardImages, type CardImageRow } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

export interface CardImageRef {
  id: string;
  createdAt: Date;
}

export async function saveCardImage(
  contactId: string,
  noteId: string | null,
  mediaType: string,
  dataBase64: string,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(cardImages).values({ id, contactId, noteId, mediaType, dataBase64 });
  return id;
}

export async function getCardImage(id: string): Promise<CardImageRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(cardImages).where(eq(cardImages.id, id)).limit(1);
  return row ?? null;
}

/** Refs only (no image data) — for rendering thumbnails via the image route. */
export async function listCardImageRefs(contactId: string): Promise<CardImageRef[]> {
  const db = await getDb();
  return db
    .select({ id: cardImages.id, createdAt: cardImages.createdAt })
    .from(cardImages)
    .where(eq(cardImages.contactId, contactId))
    .orderBy(desc(cardImages.createdAt));
}

export async function countCardImages(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cardImages);
  return row?.count ?? 0;
}

/** Photos are the most sensitive artifact — deletes are always hard. */
export async function deleteCardImagesByNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.delete(cardImages).where(eq(cardImages.noteId, noteId));
}

/** Pass `conn` (e.g. a transaction) so callers like forgetContact can keep
 *  this delete inside their own atomic cascade instead of a separate connection. */
export async function deleteCardImagesByContact(
  contactId: string,
  conn?: DhagaDb,
): Promise<void> {
  const db = conn ?? (await getDb());
  await db.delete(cardImages).where(eq(cardImages.contactId, contactId));
}

export async function deleteAllCardImages(): Promise<number> {
  const db = await getDb();
  const rows = await db.delete(cardImages).returning({ id: cardImages.id });
  return rows.length;
}
