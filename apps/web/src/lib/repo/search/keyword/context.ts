import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { followUps, sessionContacts, sessions, signals } from "@/lib/db/schema";
import {
  SEARCH_HEADLINE_OPTS,
  SEARCH_WEIGHT_FOLLOW_UPS,
  SEARCH_WEIGHT_SESSIONS,
  SEARCH_WEIGHT_SIGNALS,
} from "@/utils/constants/search";
import { buildTsQuery } from "../tokenize";
import { stripHeadlineMarkers, type KeywordHit } from "./types";

export async function followUpHits(words: string[]): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const text = sql`${followUps.action} || coalesce(' — ' || ${followUps.dueHint}, '')`;
  const rows = await db
    .select({
      contactId: followUps.contactId,
      rank: sql<number>`ts_rank(${followUps}.search_tsv, to_tsquery('english', ${tsq}))`,
      snippet: sql<string>`ts_headline('english', ${text}, to_tsquery('english', ${tsq}), ${SEARCH_HEADLINE_OPTS})`,
    })
    .from(followUps)
    .where(
      and(
        eq(followUps.status, "open"),
        sql`${followUps}.search_tsv @@ to_tsquery('english', ${tsq})`,
      ),
    );
  return rows.map((row) => ({
    contactId: row.contactId,
    score: row.rank * SEARCH_WEIGHT_FOLLOW_UPS,
    match: `follow-up: ${stripHeadlineMarkers(row.snippet)}`,
  }));
}

/** Sessions attended (e.g. "met at the AI summit") — via session_contacts. */
export async function sessionHits(words: string[]): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const rows = await db
    .select({
      contactId: sessionContacts.contactId,
      name: sessions.name,
      rank: sql<number>`ts_rank(${sessions}.search_tsv, to_tsquery('english', ${tsq}))`,
    })
    .from(sessionContacts)
    .innerJoin(sessions, eq(sessions.id, sessionContacts.sessionId))
    .where(sql`${sessions}.search_tsv @@ to_tsquery('english', ${tsq})`);
  return rows.map((row) => ({
    contactId: row.contactId,
    score: row.rank * SEARCH_WEIGHT_SESSIONS,
    match: `met at: ${row.name}`,
  }));
}

/** Proactive-intelligence signals (job changes, news) not yet dismissed. */
export async function signalHits(words: string[]): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const text = sql`${signals.headline} || '. ' || ${signals.detail}`;
  const rows = await db
    .select({
      contactId: signals.contactId,
      rank: sql<number>`ts_rank(${signals}.search_tsv, to_tsquery('english', ${tsq}))`,
      snippet: sql<string>`ts_headline('english', ${text}, to_tsquery('english', ${tsq}), ${SEARCH_HEADLINE_OPTS})`,
    })
    .from(signals)
    .where(
      and(eq(signals.status, "new"), sql`${signals}.search_tsv @@ to_tsquery('english', ${tsq})`),
    );
  return rows.map((row) => ({
    contactId: row.contactId,
    score: row.rank * SEARCH_WEIGHT_SIGNALS,
    match: `signal: ${stripHeadlineMarkers(row.snippet)}`,
  }));
}
