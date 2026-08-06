// Split per the 150-line rule; import paths unchanged (@/lib/repo/embeddings).
export {
  upsertEmbedding,
  deleteEmbedding,
  deleteEmbeddingsByContact,
  deleteEmbeddingsForNote,
  type EmbeddingOwner,
} from "./mutations";
export { semanticSearch, type SemanticHit } from "./search";
export { countUnindexed, ensureIndexed, backfillEmbeddings } from "./backfill";
