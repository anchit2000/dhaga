import type {
  SearchDocument,
  SearchIndex,
  SearchIndexResult,
  SearchKind,
  SearchQuery,
  SearchWriteOptions,
} from "@dhaga/core";
import { getSearchIndex, registerSearchIndex, selectSearchIndex } from "@dhaga/core";
import { hybridSearch } from "@/lib/repo/search";
import { searchGraphTargets, type GraphTargetKind } from "@/lib/repo/graph-data";
import {
  countUnindexed,
  deleteEmbedding,
  deleteEmbeddingsByContact,
  ensureIndexed,
  upsertEmbedding,
  type EmbeddingOwner,
} from "@/lib/repo/embeddings";
import type { DhagaDb } from "@/lib/db";

export { getSearchIndex, registerSearchIndex, selectSearchIndex };

/** Kinds the semantic (pgvector) index covers — the others carry no embedding. */
function embeddingOwner(kind: SearchKind): EmbeddingOwner | null {
  return kind === "note" || kind === "fact" || kind === "contact" ? kind : null;
}

/** Kinds the graph typeahead (searchGraphTargets) can surface. */
function isGraphTargetKind(kind: SearchKind): kind is GraphTargetKind {
  return kind === "contact" || kind === "company" || kind === "entity" || kind === "event";
}

function connection(options?: SearchWriteOptions): DhagaDb | undefined {
  return options?.transaction as DhagaDb | undefined;
}

/**
 * Postgres search index (the default, self-host path). Read side delegates to
 * the two existing search shapes: `hybridSearch` (keyword FTS + pgvector
 * semantic, contact-scored) for relevance search, and `searchGraphTargets`
 * (multi-kind label typeahead) for prefix picking. Write side maintains only
 * the semantic index — the keyword index is kept current by Postgres GENERATED
 * tsvector/trigram columns, so those writes are no-ops here.
 */
export class PostgresSearchIndex implements SearchIndex {
  readonly id = "postgres";

  async search(query: SearchQuery): Promise<SearchIndexResult[]> {
    const text = query.text.trim();
    if (!text) return [];
    return query.matchMode === "prefix" || query.matchMode === "exact"
      ? this.searchTargets(query, text)
      : this.searchContacts(query, text);
  }

  /** Fuzzy relevance path: hybrid keyword + semantic, contact-scored. */
  private async searchContacts(query: SearchQuery, text: string): Promise<SearchIndexResult[]> {
    const hits = await hybridSearch(text, query.restrictTo, query.weights);
    const results = hits.map((hit): SearchIndexResult => ({
      id: hit.contactId,
      kind: "contact",
      label: hit.name,
      sublabel: [hit.title, hit.companyName].filter(Boolean).join(" · ") || null,
      score: hit.score,
      matches: hit.matches,
    }));
    return typeof query.limit === "number" ? results.slice(0, query.limit) : results;
  }

  /** Prefix typeahead path: multi-kind label search over graph nodes. */
  private async searchTargets(query: SearchQuery, text: string): Promise<SearchIndexResult[]> {
    const kinds = query.kinds?.filter(isGraphTargetKind);
    const targets = kinds ? await searchGraphTargets(text, kinds) : await searchGraphTargets(text);
    // Targets arrive in a deliberate round-robin rank order; a descending score
    // by position keeps that order under any score-based re-sort downstream.
    const results = targets.map((target, index): SearchIndexResult => ({
      id: target.id,
      kind: target.kind,
      label: target.label,
      sublabel: target.sublabel,
      score: targets.length - index,
    }));
    return typeof query.limit === "number" ? results.slice(0, query.limit) : results;
  }

  async indexDocument(document: SearchDocument): Promise<void> {
    // Keyword side: no-op — Postgres maintains the tsvector/trigram index via
    // GENERATED columns on write, so there is nothing to push. Only the
    // semantic (pgvector) side needs an explicit upsert. (SearchWriteOptions is
    // intentionally not threaded: upsertEmbedding opens its own connection.)
    const owner = embeddingOwner(document.kind);
    if (!owner) return;
    await upsertEmbedding(owner, document.id, document.contactId, document.content);
  }

  async removeDocument(kind: SearchKind, id: string, options?: SearchWriteOptions): Promise<void> {
    // Keyword side: no-op (GENERATED columns vanish with the row). Semantic
    // side: drop the embedding, honoring the caller's transaction handle.
    const owner = embeddingOwner(kind);
    if (!owner) return;
    await deleteEmbedding(owner, id, connection(options));
  }

  async removeByContact(contactId: string, options?: SearchWriteOptions): Promise<void> {
    await deleteEmbeddingsByContact(contactId, connection(options));
  }

  async reindex(): Promise<void> {
    // Keyword index needs no backfill (GENERATED columns are always current);
    // this backfills the semantic index for pre-existing rows. Guarded and
    // idempotent (one run per process at a time).
    await ensureIndexed();
  }

  countUnindexed(): Promise<number> {
    return countUnindexed();
  }
}

registerSearchIndex(new PostgresSearchIndex());
