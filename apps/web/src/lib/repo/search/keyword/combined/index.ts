import type { DhagaDb } from "@/lib/db";
import type { SearchWeights } from "@/utils/constants/search";
import { detailSnippet } from "../snippet";
import { stripHeadlineMarkers, type KeywordHit } from "../types";
import { buildCombinedKeywordQuery } from "./query";

/**
 * Every keyword source folded into ONE round-trip on ONE connection.
 *
 * Each source used to run as its own query, fanned out with `Promise.all`.
 * That was a double problem against the hosted tenant pool: the fan-out issued
 * six `getDb()` calls that each checked out a *separate* pooled connection (the
 * request-scope memo doesn't dedupe concurrent callers inside a server action),
 * so a single search needed six connections from a max-of-three pool and
 * dead-locked on the connect timeout — normal search returned HTTP 500. Even
 * when it didn't, six serial network round-trips to a region-away Postgres
 * dominated latency (query execution is sub-25ms). One UNION ALL, with identity
 * joined onto every branch so the follow-up identity lookup folds in too, makes
 * the whole keyword phase a single query.
 *
 * Scoring is byte-for-byte the old model: raw `ts_rank` per branch (plus the
 * identity branch's `word_similarity` typo score and trigram flag) times the
 * per-source weight, with the exact same snippet labels and `detailSnippet`.
 */

export interface CombinedIdentity {
  name: string;
  title: string | null;
  companyName: string | null;
}

export interface CombinedKeywordResult {
  hits: KeywordHit[];
  /** Identity for every contact the keyword phase matched — lets hybridSearch
   *  skip its separate identity round-trip. */
  identities: Map<string, CombinedIdentity>;
}

type Source = "identity" | "notes" | "facts" | "followups" | "events" | "signals";

/** Result-card order: identity receipts first, then notes/facts/context — the
 *  order the old per-source merge used, which decides which snippets survive
 *  hybridSearch's 4-per-contact cap. */
const SOURCE_ORDER: Source[] = ["identity", "notes", "facts", "followups", "events", "signals"];

/** Which weight bucket each source's ts_rank is multiplied by. */
const SOURCE_WEIGHT: Record<Source, keyof SearchWeights> = {
  identity: "identity",
  notes: "notes",
  facts: "facts",
  followups: "followUps",
  events: "events",
  signals: "signals",
};

const SNIPPET_LABEL: Partial<Record<Source, string>> = {
  notes: "note: ",
  facts: "fact: ",
  followups: "follow-up: ",
  signals: "signal: ",
};

interface Row {
  contact_id: string;
  source: Source;
  rank: number | string;
  trigram_match: boolean;
  snippet: string | null;
  c_name: string;
  c_title: string | null;
  c_company_name: string | null;
  i_location: string | null;
  i_tags: string[] | null;
  i_emails: unknown;
  i_phones: unknown;
  i_links: unknown;
  i_company_domain: string | null;
  i_company_sector: string | null;
}

export async function combinedKeywordHits(
  db: DhagaDb,
  words: string[],
  weights: SearchWeights,
): Promise<CombinedKeywordResult> {
  if (words.length === 0) return { hits: [], identities: new Map() };

  const result = (await db.execute(buildCombinedKeywordQuery(words))) as unknown as { rows: Row[] };

  const identities = new Map<string, CombinedIdentity>();
  // Sort by source so identity rows are applied first (snippet-cap order).
  const rows = [...result.rows].sort(
    (a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source),
  );

  const hits: KeywordHit[] = [];
  for (const row of rows) {
    if (!row.contact_id) continue;
    if (!identities.has(row.contact_id)) {
      identities.set(row.contact_id, {
        name: row.c_name,
        title: row.c_title,
        companyName: row.c_company_name,
      });
    }
    const rank = typeof row.rank === "string" ? Number(row.rank) : row.rank;
    hits.push({
      contactId: row.contact_id,
      score: rank * weights[SOURCE_WEIGHT[row.source]] + (row.trigram_match ? weights.trigram : 0),
      match: snippetFor(row, words),
    });
  }
  return { hits, identities };
}

function snippetFor(row: Row, words: string[]): string | undefined {
  if (row.source === "identity") {
    return detailSnippet(words, {
      location: row.i_location,
      tags: row.i_tags,
      emails: row.i_emails as never,
      phones: row.i_phones as never,
      links: row.i_links as never,
      companyDomain: row.i_company_domain,
      companySector: row.i_company_sector,
    });
  }
  if (row.source === "events") return `met at: ${row.snippet ?? ""}`;
  return `${SNIPPET_LABEL[row.source] ?? ""}${stripHeadlineMarkers(row.snippet ?? "")}`;
}
