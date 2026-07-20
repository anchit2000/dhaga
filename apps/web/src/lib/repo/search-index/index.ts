// Barrel for the app-side search-index gateway. Importing this evaluates
// ./postgres, which registers PostgresSearchIndex as a side effect — so every
// caller must reach getSearchIndex() through here (never straight from
// @dhaga/core), exactly as embeddings.ts reaches getVectorStore via
// ./vector-store. See @dhaga/core's search-index gateway for the contract.
export { getSearchIndex, registerSearchIndex, selectSearchIndex } from "./postgres";
