import { eq } from "drizzle-orm";
import { positions } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

/**
 * Recompute the denormalised primary-position fields (`contacts.title` /
 * `company_id`) for one contact from its live `positions` rows.
 *
 * The primary is the first current role, else the first by `sortOrder` — the
 * same rule as core's `primaryPosition()`. That helper is typed for
 * ContactProfile positions (company as a name string); here the rows already
 * carry the resolved `company_id`, so the identical selection is applied to
 * rows to avoid a needless round-trip through ContactProfile. Both the merge
 * (after re-pointing positions onto the survivor) and the add-to-company bulk
 * action reuse this so the denormalised columns never drift from `positions`.
 *
 * Runs on the caller's transaction so the recompute stays inside their atomic
 * write.
 */
export async function computePrimaryDenorm(
  tx: DhagaDb,
  contactId: string,
): Promise<{ title: string | null; companyId: string | null }> {
  const rows = await tx
    .select({
      title: positions.title,
      companyId: positions.companyId,
      isCurrent: positions.isCurrent,
    })
    .from(positions)
    .where(eq(positions.contactId, contactId))
    .orderBy(positions.sortOrder);
  const primary = rows.find((row) => row.isCurrent) ?? rows[0] ?? null;
  return { title: primary?.title?.trim() || null, companyId: primary?.companyId ?? null };
}
