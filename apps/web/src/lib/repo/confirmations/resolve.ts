import { and, eq } from "drizzle-orm";
import { confirmationPayloadSchema } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
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
  const [row] = await db
    .select()
    .from(confirmations)
    .where(and(eq(confirmations.id, id), eq(confirmations.status, "pending")))
    .limit(1);
  if (!row) return null;

  const payload = confirmationPayloadSchema.parse(row.payload);
  const result = await applyConfirmation(payload, row.sourceNoteId, choice);
  await db
    .update(confirmations)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(confirmations.id, id));
  return result;
}

/**
 * Reject a pending confirmation. enrichment_match is special: it points at a
 * fact enrichment ALREADY wrote (badged unverified), so rejecting it means
 * deleting that fact — not just hiding the prompt. Every other type proposes
 * rows that were never written, so dismiss is a pure state flip (like
 * dismissEdgeSuggestion).
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
