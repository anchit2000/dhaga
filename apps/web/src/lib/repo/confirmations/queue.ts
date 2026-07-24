import { desc, eq, sql } from "drizzle-orm";
import { confirmationPayloadSchema, type ConfirmationPayload, type ConfirmationType } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { confirmations, contacts } from "@/lib/db/schema";

/** One pending confirmation, with the subject contact's name resolved for the
 *  inbox. `payload` is validated back into its discriminated shape so the UI
 *  can switch on `payload.type` without re-parsing. */
export interface ConfirmationView {
  id: string;
  type: ConfirmationType;
  payload: ConfirmationPayload;
  contactId: string | null;
  contactName: string | null;
  sourceNoteId: string | null;
  createdAt: Date;
}

/** Pending confirmations, newest first, with the subject contact hydrated. */
export async function listPendingConfirmations(): Promise<ConfirmationView[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: confirmations.id,
      payload: confirmations.payload,
      contactId: confirmations.contactId,
      contactName: contacts.name,
      sourceNoteId: confirmations.sourceNoteId,
      createdAt: confirmations.createdAt,
    })
    .from(confirmations)
    .leftJoin(contacts, eq(contacts.id, confirmations.contactId))
    .where(eq(confirmations.status, "pending"))
    .orderBy(desc(confirmations.createdAt));

  return rows.map((row) => {
    const payload = confirmationPayloadSchema.parse(row.payload);
    return {
      id: row.id,
      type: payload.type,
      payload,
      contactId: row.contactId,
      contactName: row.contactName,
      sourceNoteId: row.sourceNoteId,
      createdAt: row.createdAt,
    };
  });
}

/** Cheap COUNT for the nav badge — no payload hydration. */
export async function countPendingConfirmations(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(confirmations)
    .where(eq(confirmations.status, "pending"));
  return row?.count ?? 0;
}
