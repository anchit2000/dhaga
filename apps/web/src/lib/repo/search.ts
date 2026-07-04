import { and, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, facts, notes } from "@/lib/db/schema";
import { semanticSearch } from "./embeddings";

export interface SearchHit {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  score: number;
  /** Labeled snippets explaining why this contact matched (the receipts). */
  matches: string[];
}

function queryWords(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 3),
    ),
  ];
}

function anyWordMatches(column: SQL, words: string[]): SQL {
  // Callers guarantee words is non-empty, so or() never returns undefined.
  return or(...words.map((word) => ilike(column, `%${word}%`))) as SQL;
}

/**
 * Hybrid retrieval (M6 free path — both stages run locally): weighted
 * keyword match over contacts/facts/notes plus semantic similarity over
 * the embeddings index. Optional `restrictTo` narrows to structured-filter
 * candidates (query-understanding stage).
 */
export async function hybridSearch(
  query: string,
  restrictTo?: Set<string>,
): Promise<SearchHit[]> {
  const words = queryWords(query);
  const db = await getDb();
  const hits = new Map<string, { score: number; matches: string[] }>();
  const bump = (contactId: string, score: number, match?: string) => {
    if (restrictTo && !restrictTo.has(contactId)) return;
    const hit = hits.get(contactId) ?? { score: 0, matches: [] };
    hit.score += score;
    if (match && hit.matches.length < 4) hit.matches.push(match);
    hits.set(contactId, hit);
  };

  const semanticHits = await semanticSearch(query);
  for (const hit of semanticHits) {
    const snippet =
      hit.content.length > 140 ? `${hit.content.slice(0, 140)}…` : hit.content;
    bump(hit.contactId, hit.similarity * 4, `related ${hit.ownerType}: ${snippet}`);
  }
  if (words.length > 0) {
    const identityRows = await db
      .select({ id: contacts.id })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(
        or(
          anyWordMatches(sql`${contacts.name}`, words),
          anyWordMatches(sql`${contacts.title}`, words),
          anyWordMatches(sql`${companies.name}`, words),
          anyWordMatches(sql`${contacts.tags}::text`, words),
        ),
      );
    for (const row of identityRows) bump(row.id, 3);

    const factRows = await db
      .select({ contactId: facts.contactId, text: facts.text })
      .from(facts)
      .where(and(isNull(facts.deletedAt), anyWordMatches(sql`${facts.text}`, words)));
    for (const row of factRows) bump(row.contactId, 2, `fact: ${row.text}`);

    const noteRows = await db
      .select({ contactId: notes.contactId, body: notes.body })
      .from(notes)
      .where(and(isNull(notes.deletedAt), anyWordMatches(sql`${notes.body}`, words)));
    for (const row of noteRows) {
      const snippet = row.body.length > 140 ? `${row.body.slice(0, 140)}…` : row.body;
      bump(row.contactId, 1, `note: ${snippet}`);
    }
  }

  if (hits.size === 0) return [];
  const identity = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(inArray(contacts.id, [...hits.keys()]));

  return identity
    .map((row) => ({
      contactId: row.id,
      name: row.name,
      title: row.title,
      companyName: row.companyName,
      score: hits.get(row.id)?.score ?? 0,
      matches: hits.get(row.id)?.matches ?? [],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
