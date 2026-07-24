import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/request-scope";
import { facts, followUps } from "@/lib/db/schema";

/**
 * Manual (non-extraction) writes for the two graph rows that were previously
 * only ever created by the LLM: facts and follow-ups. Both are written with a
 * NULL source_note_id — like manual edges (see repo/relationships) — so no note
 * deletion can ever tombstone something the user typed by hand, and neither
 * path touches the LLM or the AI budget.
 */

/** Insert a user-typed fact: verified (a human typed it) at full confidence,
 *  no receipt. Returns the new row id. */
export async function addFact(
  contactId: string,
  type: string,
  text: string,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db
    .insert(facts)
    .values({ id, contactId, type, text: text.trim(), confidence: 1, unverified: false });
  return id;
}

/** Insert an open, user-typed follow-up. The manual path stores a machine
 *  dueDate from the date picker (dueHint stays null — that column is the LLM's
 *  free-text timing prose, e.g. "next quarter"). */
export async function addFollowUp(
  contactId: string,
  action: string,
  dueDate: Date | null,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db
    .insert(followUps)
    .values({ id, contactId, action: action.trim(), dueDate, status: "open" });
  return id;
}
