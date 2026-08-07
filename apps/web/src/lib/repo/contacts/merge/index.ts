// Split per the 150-line rule; import paths unchanged (@/lib/repo/contacts/merge).
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import type { ContactMergeResolution } from "@dhaga/core";
import { mergeContactFields } from "./fields";
import { repointContactReferences } from "./repoint";

/**
 * Fold every `sourceIds` contacts into `targetId`, in ONE transaction (pure DB —
 * no network/LLM, so holding the connection is safe). The whole game is
 * re-pointing every table that references a contact onto the survivor — mirror
 * of forgetContact's cascade list plus extraction_jobs/confirmations, which
 * both FK contacts.id but predate that cascade — then merging the surviving
 * row's own fields and hard-deleting the sources. All-or-nothing: a failure
 * anywhere rolls back, so a merge can never half-apply and strand rows pointing
 * at a deleted contact.
 */
export async function mergeContacts(
  resolution: ContactMergeResolution,
): Promise<{ targetId: string }> {
  const { targetId } = resolution;
  if (resolution.sourceIds.includes(targetId)) {
    throw new PreconditionError("A contact can't be merged into itself.");
  }
  const sourceIds = [...new Set(resolution.sourceIds)];
  const allIds = [targetId, ...sourceIds];
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(contacts).where(inArray(contacts.id, allIds));
    // RLS scopes to the user, so a mismatched or deleted id simply isn't found.
    if (rows.length !== allIds.length) {
      throw new PreconditionError("Contact not found — refresh and try again.");
    }
    const byId = new Map(rows.map((row) => [row.id, row]));
    const target = byId.get(targetId)!;
    const sourceRows = sourceIds.map((id) => byId.get(id)!);

    await repointContactReferences(tx, targetId, sourceIds);
    await mergeContactFields(tx, targetId, resolution, target, sourceRows);

    // 6) Sources are stripped of every reference — hard-delete them.
    await tx.delete(contacts).where(inArray(contacts.id, sourceIds));
  });
  return { targetId };
}
