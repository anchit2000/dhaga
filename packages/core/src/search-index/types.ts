/**
 * Provider-agnostic in-app search index — the counterpart to VectorStore
 * (../retrieval) and SearchClient (../search, provider-agnostic *web* search,
 * a different domain). This is the one contract every in-app search call site
 * depends on, so swapping Postgres (keyword via GENERATED tsvector/trigram
 * columns + pgvector semantic) for an external engine (Elasticsearch,
 * Typesense, Meilisearch…) means a new SearchIndex implementation plus one
 * case in getSearchIndex() — zero changes to callers (Dependency Inversion,
 * Open/Closed).
 */

export type SearchKind = "contact" | "company" | "entity" | "event" | "note" | "fact";

/**
 * Ranking-signal weights, applied best-effort by the provider. The Postgres
 * impl uses every field (`ts_rank(...) * weight`, summed per contact across
 * each source that matched); a provider without a given signal ignores that
 * field. Defined here so it is the one shared shape across the query surface —
 * the defaults + parser live app-side (apps/web/src/utils/constants/search.ts).
 */
export interface SearchWeights {
  semantic: number;
  identity: number;
  trigram: number;
  facts: number;
  notes: number;
  followUps: number;
  events: number;
  signals: number;
}

export interface SearchQuery {
  /** Raw user text. */
  text: string;
  /** Restrict to these entity kinds; omitted = the provider's default set. */
  kinds?: SearchKind[];
  /** Max results; the provider applies its own cap when omitted. */
  limit?: number;
  /**
   * Hard candidate allow-list (the query-understanding stage): ids outside are
   * dropped, and ids inside must surface even with no textual score of their
   * own (structured-filter matches are a guarantee, not a ranking hint).
   */
  restrictTo?: Set<string>;
  /** Ranking-signal weights (see SearchWeights). */
  weights?: SearchWeights;
  /**
   * "fuzzy" (default): full relevance ranking (keyword + semantic).
   * "prefix": typeahead over entity labels (prefix-ranked).
   * "exact": exact-token match (e.g. write-time identity resolution).
   */
  matchMode?: "fuzzy" | "prefix" | "exact";
}

export interface SearchIndexResult {
  id: string;
  kind: SearchKind;
  label: string;
  /** Disambiguating secondary line (title · company, event date, …). */
  sublabel?: string | null;
  score: number;
  /** Labeled snippets explaining why this matched (the receipts). */
  matches?: string[];
}

/**
 * One indexable record. `contactId` owns the document — deletion cascades by
 * contact — and equals `id` for a contact document.
 */
export interface SearchDocument {
  kind: SearchKind;
  id: string;
  contactId: string;
  content: string;
}

export interface SearchWriteOptions {
  /**
   * Provider-specific transaction/session handle supplied by an owning
   * repository, so an index write can join the caller's atomic cascade
   * (mirrors VectorWriteOptions.transaction in ../retrieval).
   */
  transaction?: unknown;
}

export interface SearchIndex {
  id: string;
  /** Read: relevance/typeahead search over the index. */
  search(query: SearchQuery): Promise<SearchIndexResult[]>;
  /**
   * Write: (re)index one document. A no-op for engines whose keyword index is
   * maintained by the store itself (e.g. Postgres GENERATED columns), where
   * only the semantic side needs an explicit write.
   */
  indexDocument(document: SearchDocument, options?: SearchWriteOptions): Promise<void>;
  /** Write: remove one document from the index. */
  removeDocument(kind: SearchKind, id: string, options?: SearchWriteOptions): Promise<void>;
  /** Write: remove every document owned by a contact (deletion cascade). */
  removeByContact(contactId: string, options?: SearchWriteOptions): Promise<void>;
  /** Backfill any documents missing from the index. Idempotent. */
  reindex(): Promise<void>;
  /** How many indexable rows are not yet in the index (backfill affordance). */
  countUnindexed(): Promise<number>;
}
