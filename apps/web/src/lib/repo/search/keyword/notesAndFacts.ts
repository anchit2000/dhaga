import { and, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { facts, notes } from "@/lib/db/schema";
import { SEARCH_HEADLINE_OPTS, type SearchWeights } from "@/utils/constants/search";
import { buildTsQuery } from "../tokenize";
import { stripHeadlineMarkers, type KeywordHit } from "./types";

export async function noteHits(words: string[], weights: SearchWeights): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const rows = await db
    .select({
      contactId: notes.contactId,
      rank: sql<number>`ts_rank(${notes}.search_tsv, to_tsquery('english', ${tsq}))`,
      snippet: sql<string>`ts_headline('english', ${notes.body}, to_tsquery('english', ${tsq}), ${SEARCH_HEADLINE_OPTS})`,
    })
    .from(notes)
    .where(
      and(isNull(notes.deletedAt), sql`${notes}.search_tsv @@ to_tsquery('english', ${tsq})`),
    );
  return rows.map((row) => ({
    contactId: row.contactId,
    score: row.rank * weights.notes,
    match: `note: ${stripHeadlineMarkers(row.snippet)}`,
  }));
}

export async function factHits(words: string[], weights: SearchWeights): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const rows = await db
    .select({
      contactId: facts.contactId,
      rank: sql<number>`ts_rank(${facts}.search_tsv, to_tsquery('english', ${tsq}))`,
      snippet: sql<string>`ts_headline('english', ${facts.text}, to_tsquery('english', ${tsq}), ${SEARCH_HEADLINE_OPTS})`,
    })
    .from(facts)
    .where(
      and(isNull(facts.deletedAt), sql`${facts}.search_tsv @@ to_tsquery('english', ${tsq})`),
    );
  return rows.map((row) => ({
    contactId: row.contactId,
    score: row.rank * weights.facts,
    match: `fact: ${stripHeadlineMarkers(row.snippet)}`,
  }));
}
