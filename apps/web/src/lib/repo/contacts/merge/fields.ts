import { eq } from "drizzle-orm";
import { contacts, type ContactRow } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";
import type { ContactMergeResolution } from "@dhaga/core";
import { computePrimaryDenorm } from "../primary-position";
import { unionByValue, unionMethods, unionTags } from "../merge-fields";

// 5) Merge the survivor's own row: user-resolved scalars, unioned
// multi-value fields, OR-ed flags, cadence, and denorm recomputed from the
// now-merged positions.
export async function mergeContactFields(
  tx: DhagaDb,
  targetId: string,
  resolution: ContactMergeResolution,
  target: ContactRow,
  sourceRows: ContactRow[],
): Promise<void> {
  const denorm = await computePrimaryDenorm(tx, targetId);
  const allRows = [target, ...sourceRows];
  const lastReachedOutAt =
    allRows
      .map((row) => row.lastReachedOutAt)
      .filter((date): date is Date => date != null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  await tx
    .update(contacts)
    .set({
      name: resolution.name.trim(),
      nickname: resolution.nickname?.trim() || null,
      location: resolution.location?.trim() || null,
      emails: unionMethods(allRows.map((row) => row.emails)),
      phones: unionMethods(allRows.map((row) => row.phones)),
      links: unionMethods(allRows.map((row) => row.links)),
      addresses: unionByValue(allRows.map((row) => row.addresses)),
      importantDates: unionByValue(allRows.map((row) => row.importantDates)),
      customFields: unionByValue(allRows.map((row) => row.customFields)),
      tags: unionTags(allRows.map((row) => row.tags)),
      starred: allRows.some((row) => row.starred),
      watchedForSignals: allRows.some((row) => row.watchedForSignals),
      reachOutEveryDays:
        target.reachOutEveryDays ??
        sourceRows.find((row) => row.reachOutEveryDays != null)?.reachOutEveryDays ??
        null,
      lastReachedOutAt,
      title: denorm.title,
      companyId: denorm.companyId,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, targetId));
}
