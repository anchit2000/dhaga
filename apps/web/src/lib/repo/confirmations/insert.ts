import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db/request-scope";
import { confirmations } from "@/lib/db/schema";
import type { ConfirmationPayload } from "@dhaga/core";

/**
 * Where a confirmation was raised. `inline` cards are answered synchronously in
 * the surface that raised them (web quick-add); `messaging` ones come from a
 * background batch and have no surface but the inbox. The queue reads this to
 * decide what to show — see ./queue.ts.
 */
export type ConfirmationOrigin = "inline" | "messaging";

export async function insertConfirmation(
  payload: ConfirmationPayload,
  sourceNoteId: string | null,
  contactId: string | null,
  origin: ConfirmationOrigin = "inline",
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db
    .insert(confirmations)
    .values({ id, type: payload.type, payload, sourceNoteId, contactId, origin });
  return id;
}
