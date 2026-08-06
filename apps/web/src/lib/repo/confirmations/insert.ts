import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db/request-scope";
import { confirmations } from "@/lib/db/schema";
import type { ConfirmationPayload } from "@dhaga/core";

export async function insertConfirmation(
  payload: ConfirmationPayload,
  sourceNoteId: string | null,
  contactId: string | null,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(confirmations).values({ id, type: payload.type, payload, sourceNoteId, contactId });
  return id;
}
