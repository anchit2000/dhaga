// Runtime services: the LLM gateway, prompt builders, heuristic parse, web
// search, geocoding, retrieval/embeddings, and calendar providers. Re-exported from
// index.ts via `export *`.
//
// Split into a directory per the 150-line rule; import paths are unchanged
// ("./services" resolves here). The LLM gateway's names live in ./llm and are
// re-exported wholesale below — the allowlist itself stays explicit there.
export * from "./llm";
export { heuristicContactParse } from "../parse/heuristic-contact";
export { cardReceiptText } from "../parse/card-receipt";
export { withUrlScheme } from "../parse/web-url";
export {
  FirecrawlSearchClient,
  getSearchClient,
  getSearchProvider,
  hasSearch,
  registerSearchProvider,
  selectSearchProvider,
  type SearchClient,
  type SearchOptions,
  type SearchProvider,
  type SearchResult,
} from "../search";
export {
  NominatimGeocodingClient,
  OSM_ATTRIBUTION,
  createRateLimiter,
  getGeocodingClient,
  getGeocodingProvider,
  hasGeocoding,
  normalizeLocationQuery,
  registerGeocodingProvider,
  selectGeocodingProvider,
  type GeocodeResult,
  type GeocodingClient,
  type GeocodingProvider,
  type RateLimitedRunner,
} from "../geocoding";
export {
  assertCompatibleVectorDimensions,
  DEFAULT_EMBEDDING_DIMENSIONS,
  getEmbeddingProvider,
  getVectorStore,
  registerEmbeddingProvider,
  registerVectorStore,
  selectEmbeddingProvider,
  selectVectorStore,
  type EmbeddingProvider,
  type VectorHit,
  type VectorRecord,
  type VectorSearchOptions,
  type VectorStore,
  type VectorWriteOptions,
} from "../retrieval";
export {
  getSearchIndex,
  registerSearchIndex,
  selectSearchIndex,
  type SearchDocument,
  type SearchIndex,
  type SearchIndexResult,
  type SearchKind,
  type SearchQuery,
  type SearchWeights,
  type SearchWriteOptions,
} from "../search-index";
export {
  DemoCalendarProvider,
  GoogleCalendarProvider,
  MicrosoftCalendarProvider,
  buildAddToCalendarLinks,
  buildIcs,
  connectionCapabilities,
  dayLoad,
  findOpenSlots,
  followUpToCalendarEvent,
  getCalendarProvider,
  isOverloaded,
  listCalendarProviders,
  listConnectableCalendarProviders,
  mergeBusy,
  registerCalendarProvider,
  spreadAcrossWeek,
  type BusyInterval,
  type CalendarCapabilities,
  type CalendarEvent,
  type CalendarProvider,
  type CalendarProviderInfo,
  type CalendarTokens,
  type CalendarWriteEvent,
  type DayBucket,
  type DayLoad,
  type OpenSlot,
  type SpreadItem,
  type TimeRange,
  type WorkingHours,
} from "../calendar";
