import { and, eq } from "drizzle-orm";
import { confirmationPayloadSchema } from "@dhaga/core";
import { getDb, withTransactionDb } from "@/lib/db/request-scope";
import { confirmations } from "@/lib/db/schema";
import { deleteFact } from "../notes";
import { applyConfirmation, type ConfirmationChoice, type ConfirmationResult } from "./apply";

/**
 * Deterministic applier: load a still-pending row (the status guard makes a
 * double-submit a no-op — the second call finds nothing), run the proposed
 * action carrying the note receipt, then flip the row resolved. Mirrors
 * confirmEdgeSuggestion. Returns what was written, or null when nothing was
 * pending (already resolved/dismissed, or unknown id).
 */
export async function resolveConfirmation(
  id: string,
  choice?: ConfirmationChoice,
): Promise<ConfirmationResult | null> {
  const db = await getDb();
  const [pending] = await db.select().from(confirmations)
    .where(and(eq(confirmations.id, id), eq(confirmations.status, "pending"))).limit(1);
  if (!pending) return null;
  const payload = confirmationPayloadSchema.parse(pending.payload);
  if (payload.type === "follow_up_date") {
    return db.transaction((tx) => withTransactionDb(tx, async () => {
      const [row] = await tx
        .update(confirmations)
        .set({ status: "resolving" })
        .where(and(eq(confirmations.id, id), eq(confirmations.status, "pending")))
        .returning();
      if (!row) return null;
      const result = await applyConfirmation(payload, row.sourceNoteId, choice);
      await tx.update(confirmations).set({ status: "resolved", resolvedAt: new Date() })
        .where(and(eq(confirmations.id, id), eq(confirmations.status, "resolving")));
      return result;
    }));
  }

  // Other confirmation kinds may embed or schedule post-response work. Claim
  // in one committed statement so no network call is held inside a transaction.
  const [claimed] = await db
      .update(confirmations)
      .set({ status: "resolving" })
      .where(and(eq(confirmations.id, id), eq(confirmations.status, "pending")))
      .returning();
  if (!claimed) return null;
  try {
    const result = await applyConfirmation(payload, claimed.sourceNoteId, choice);
    await db.update(confirmations).set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(confirmations.id, id), eq(confirmations.status, "resolving")));
    return result;
  } catch (error) {
    await db.update(confirmations).set({ status: "pending" })
      .where(and(eq(confirmations.id, id), eq(confirmations.status, "resolving")));
    throw error;
  }
}

/**
 * Reject a pending confirmation. enrichment_match is special: it points at a
 * fact enrichment ALREADY wrote (badged unverified), so rejecting it means
 * deleting that fact — not just hiding the prompt. Dismissing follow_up_date
 * intentionally keeps its already-scheduled Saturday default. Every other type
 * proposes no prior write, so dismiss is only a state flip.
 */
export async function dismissConfirmation(id: string): Promise<void> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(confirmations)
    .where(and(eq(confirmations.id, id), eq(confirmations.status, "pending")))
    .limit(1);
  if (!row) return;

  const payload = confirmationPayloadSchema.parse(row.payload);
  if (payload.type === "enrichment_match") {
    await deleteFact(payload.apply.factId);
  }
  await db
    .update(confirmations)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(eq(confirmations.id, id));
}
