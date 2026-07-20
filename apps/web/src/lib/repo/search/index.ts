import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { semanticSearch, type SemanticHit } from "../embeddings";
import { DEFAULT_SEARCH_WEIGHTS, type SearchWeights } from "@/utils/constants/search";
import { queryWords } from "./tokenize";
import {
  contactAndCompanyHits,
  factHits,
  followUpHits,
  noteHits,
  eventHits,
  signalHits,
  type KeywordHit,
} from "./keyword";

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
  const db = await getDb();
  const hits: HitAccumulator = new Map();

  // Run the semantic and keyword stages CONCURRENTLY. The semantic stage
  // embeds the query with a local ONNX model (onnxruntime-node is unsupported
  // on Vercel serverless — see lib/ai/embedder.ts), so it must never gate or
  // break the keyword FTS results (already GIN-indexed): wrap it so any
  // failure or absence degrades to keyword-only rather than delaying the whole
  // search. Previously it ran first and was awaited, so every query paid the
  // embedder's load time — and its failure — before keyword search even began.
  const [semanticHits, keywordSources] = await Promise.all([
    semanticSearch(query).catch((): SemanticHit[] => []),
    words.length > 0
      ? Promise.all([
          contactAndCompanyHits(words, weights),
          noteHits(words, weights),
          factHits(words, weights),
          followUpHits(words, weights),
          eventHits(words, weights),
          signalHits(words, weights),
        ])
      : Promise.resolve<KeywordHit[][]>([]),
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
  for (const source of keywordSources) applyHits(hits, source, restrictTo);

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
  const identityRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(inArray(contacts.id, [...hits.keys()]));

  return identityRows
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
