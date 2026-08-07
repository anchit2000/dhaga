import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, companyAliases, contacts, edges, followUps, positions } from "@/lib/db/schema";
import { addAliasesInTx } from "@/lib/repo/company-aliases";
import { PreconditionError } from "@/lib/repo/errors";
import type { CompanyMergeResolution } from "@dhaga/core";

/**
 * Fold one or more companies into a survivor: re-point every reference —
 * contacts, positions, and graph edges — onto the target, apply the
 * user-resolved name/domain/sector, then delete the losing rows.
 *
 * One transaction: all statements are pure DB writes, so a failure anywhere
 * (e.g. the final delete blocked by an unforeseen FK) rolls the whole thing
 * back rather than stranding half-merged references. The synthesised works_at
 * graph edges and the graph ETag follow automatically once contacts.company_id
 * moves — nothing extra to do here.
 */
export async function mergeCompanies(
  resolution: CompanyMergeResolution,
): Promise<{ targetId: string }> {
  const { targetId, sourceIds } = resolution;
  if (sourceIds.includes(targetId)) {
    throw new PreconditionError("A company can't be merged into itself.");
  }
  const db = await getDb();
  await db.transaction(async (tx) => {
    const ids = [targetId, ...sourceIds];
    const found = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(inArray(companies.id, ids));
    if (found.length !== new Set(ids).size) {
      throw new PreconditionError("One or more of these companies no longer exists.");
    }
    // Re-point every reference from the losing companies onto the survivor.
    await tx.update(contacts).set({ companyId: targetId }).where(inArray(contacts.companyId, sourceIds));
    await tx.update(positions).set({ companyId: targetId }).where(inArray(positions.companyId, sourceIds));
    await tx.update(followUps).set({ companyId: targetId }).where(inArray(followUps.companyId, sourceIds));
    await tx
      .update(edges)
      .set({ srcId: targetId })
      .where(and(eq(edges.srcType, "company"), inArray(edges.srcId, sourceIds)));
    await tx
      .update(edges)
      .set({ dstId: targetId })
      .where(and(eq(edges.dstType, "company"), inArray(edges.dstId, sourceIds)));
    // A company edge that now points to itself carries no meaning — drop it
    // (mirrors mergeMentionedContact's self-edge cleanup).
    await tx.delete(edges).where(
      and(
        eq(edges.srcType, "company"),
        eq(edges.dstType, "company"),
        eq(edges.srcId, targetId),
        eq(edges.dstId, targetId),
      ),
    );
    // Re-pointing can leave two identical LIVE edges (each source held the same
    // relationship). Keep the oldest per (src_type, src_id, predicate, dst_type,
    // dst_id) among the edges now touching the target; drop the rest.
    await tx.execute(sql`
      DELETE FROM edges e USING (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY src_type, src_id, predicate, dst_type, dst_id
          ORDER BY created_at
        ) AS rn
        FROM edges
        WHERE deleted_at IS NULL
          AND ((src_type = 'company' AND src_id = ${targetId})
            OR (dst_type = 'company' AND dst_id = ${targetId}))
      ) d
      WHERE e.id = d.id AND d.rn > 1
    `);
    // Apply the user's resolved identity to the survivor.
    await tx
      .update(companies)
      .set({
        name: resolution.name.trim(),
        domain: resolution.domain?.trim() || null,
        sector: resolution.sector?.trim() || null,
      })
      .where(eq(companies.id, targetId));
    // Preserve the losing companies' identities: record each losing name and its
    // own aliases as aliases of the survivor, so a later capture that still uses
    // an old name resolves here. Runs after the survivor's name update above (so
    // the dedupe sees the resolved name) and before the delete (the FK cascade
    // would drop the losing companies' alias rows). Same transaction — atomic.
    const losing = await tx
      .select({ name: companies.name })
      .from(companies)
      .where(inArray(companies.id, sourceIds));
    const inheritedAliases = await tx
      .select({ alias: companyAliases.alias })
      .from(companyAliases)
      .where(inArray(companyAliases.companyId, sourceIds));
    await addAliasesInTx(tx, targetId, [
      ...losing.map((row) => row.name),
      ...inheritedAliases.map((row) => row.alias),
    ]);
    await tx.delete(companies).where(inArray(companies.id, sourceIds));
  });
  return { targetId };
}
