import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { semanticSearch, type SemanticHit } from "../embeddings";
import { DEFAULT_SEARCH_WEIGHTS, type SearchWeights } from "@/utils/constants/search";
import { queryWords } from "./tokenize";
import { combinedKeywordHits, type CombinedIdentity, type KeywordHit } from "./keyword";

export interface SearchHit {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  score: number;
  /** Labeled snippets explaining why this contact matched (the receipts). */
  matches: string[];
}

type HitAccumulator = Map<string, { score: number; matches: string[] }>;

function applyHits(hits: HitAccumulator, keywordHits: KeywordHit[], restrictTo?: Set<string>): void {
  for (const hit of keywordHits) {
    if (restrictTo && !restrictTo.has(hit.contactId)) continue;
    const existing = hits.get(hit.contactId) ?? { score: 0, matches: [] };
    existing.score += hit.score;
    if (hit.match && existing.matches.length < 4) existing.matches.push(hit.match);
    hits.set(hit.contactId, existing);
  }
}

/**
 * Hybrid retrieval (M6 free path — both stages run locally): full-text
 * keyword search (tsvector + trigram, GIN-indexed) over contacts, companies,
 * notes, facts, follow-ups, events, and signals, plus semantic similarity
 * over the embeddings index. Optional `restrictTo` narrows to structured-
 * filter candidates (query-understanding stage).
 */
export async function hybridSearch(
  query: string,
  restrictTo?: Set<string>,
  weights: SearchWeights = DEFAULT_SEARCH_WEIGHTS,
): Promise<SearchHit[]> {
  const words = queryWords(query);
  // One connection for the whole request. The keyword phase is a single query
  // (see keyword/combined) — NOT a Promise.all fan-out of six getDb() calls,
  // which each checked out a separate pooled connection and exhausted the
  // hosted tenant pool (HTTP 500). The semantic stage runs concurrently but is
  // a no-op with embeddings off (it returns before touching the DB), so on the
  // hosted keyword-only path this whole function makes exactly one round-trip.
  const db = await getDb();
  const hits: HitAccumulator = new Map();

  // The semantic stage embeds the query with a local ONNX model (unsupported on
  // Vercel serverless — see lib/ai/embedder.ts) and must never gate or break
  // keyword results: wrap it so any failure or absence degrades to keyword-only.
  const [semanticHits, keyword] = await Promise.all([
    semanticSearch(query).catch((): SemanticHit[] => []),
    words.length > 0
      ? combinedKeywordHits(db, words, weights)
      : Promise.resolve({ hits: [] as KeywordHit[], identities: new Map<string, CombinedIdentity>() }),
  ]);

  // Semantic first, then keyword — preserves the prior merged-ranking order
  // (semantic "related …" receipts appear before keyword snippets, capped at 4).
  for (const hit of semanticHits) {
    if (restrictTo && !restrictTo.has(hit.contactId)) continue;
    const existing = hits.get(hit.contactId) ?? { score: 0, matches: [] };
    const snippet = hit.content.length > 140 ? `${hit.content.slice(0, 140)}…` : hit.content;
    existing.score += hit.similarity * weights.semantic;
    if (existing.matches.length < 4) existing.matches.push(`related ${hit.ownerType}: ${snippet}`);
    hits.set(hit.contactId, existing);
  }
  applyHits(hits, keyword.hits, restrictTo);

  // Structured filters are a hard guarantee, not just a ranking hint: a
  // contact who matches the plan's event/company/tags must surface even if
  // they have no keyword or semantic score of their own (e.g. "who did I
  // meet at the AI summit" — attendance is the whole match, not the residual
  // wording), otherwise restrictTo silently drops them from every answer.
  if (restrictTo) {
    for (const id of restrictTo) {
      if (!hits.has(id)) hits.set(id, { score: 0, matches: [] });
    }
  }

  if (hits.size === 0) return [];

  // Identity for keyword hits already rode along on the combined query. Only
  // semantic-only hits and forced restrictTo ids (never keyword-matched) still
  // need a lookup — empty on the hosted keyword path, so no extra round-trip.
  const identities = new Map<string, CombinedIdentity>(keyword.identities);
  const missing = [...hits.keys()].filter((id) => !identities.has(id));
  if (missing.length > 0) {
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        title: contacts.title,
        companyName: companies.name,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(inArray(contacts.id, missing));
    for (const row of rows) {
      identities.set(row.id, { name: row.name, title: row.title, companyName: row.companyName });
    }
  }

  return [...hits.keys()]
    .map((id) => {
      const identity = identities.get(id);
      return {
        contactId: id,
        name: identity?.name ?? "",
        title: identity?.title ?? null,
        companyName: identity?.companyName ?? null,
        score: hits.get(id)?.score ?? 0,
        matches: hits.get(id)?.matches ?? [],
      };
    })
    // A forced/semantic id whose contact row vanished (mid-request delete)
    // has no identity — drop it rather than surface a nameless card.
    .filter((hit) => identities.has(hit.contactId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
