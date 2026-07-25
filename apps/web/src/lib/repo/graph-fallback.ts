import { and, eq, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, edges } from "@/lib/db/schema";

/**
 * The daily-suggestion fallback: "if a slot is left, recommend one more person
 * purely based on graph traversal." Ranks contacts by degree centrality in the
 * user's own graph — how many non-deleted edges touch them (works_at / knows /
 * co-attended, all written by extraction into `edges`). No AI, no external data
 * (BRD §6.7: own-graph only); a well-connected contact you're not already
 * reaching out to is the most defensible "who else?" signal from structure alone.
 */

export interface GraphFallbackCandidate {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  degree: number;
}

export async function listGraphFallbackCandidates(
  excludeIds: string[],
  limit: number,
): Promise<GraphFallbackCandidate[]> {
  if (limit <= 0) return [];
  const db = await getDb();
  const touchesContact = or(
    and(eq(edges.srcType, "contact"), eq(edges.srcId, contacts.id)),
    and(eq(edges.dstType, "contact"), eq(edges.dstId, contacts.id)),
  );
  const rows = await db
    .select({
      contactId: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      degree: sql<number>`count(${edges.id})`,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(edges, and(isNull(edges.deletedAt), touchesContact))
    // Exclude note-mention stubs (source "mentioned") the same way every other
    // real-contacts query does — a stub with one relationship edge (e.g.
    // "Prashant's son") must not surface as a "who else to reach out to?".
    .where(
      excludeIds.length > 0
        ? and(ne(contacts.source, "mentioned"), notInArray(contacts.id, excludeIds))
        : ne(contacts.source, "mentioned"),
    )
    .groupBy(contacts.id, companies.id)
    .having(sql`count(${edges.id}) > 0`)
    .orderBy(sql`count(${edges.id}) desc`, contacts.createdAt)
    .limit(limit);
  return rows.map((row) => ({
    contactId: row.contactId,
    name: row.name,
    title: row.title,
    companyName: row.companyName,
    degree: Number(row.degree),
  }));
}
