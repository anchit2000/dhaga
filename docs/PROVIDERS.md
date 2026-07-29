# Extending Dhaga with providers

Dhaga's provider contracts are exported from `@dhaga/core`. A provider can
live in this monorepo or in an independent npm package; application features
only consume the contracts and never import a vendor SDK directly.

Register external packages in `apps/web/src/dhaga.providers.ts`. Next.js runs
this bootstrap once before the Node.js server accepts requests. Provider SDKs
therefore remain optional dependencies and are only bundled when imported.

## LLM providers

Implement `LLMClient`, then export an `LLMProvider` registration:

```ts
import type { LLMClient, LLMProvider } from "@dhaga/core";

const client: LLMClient = {
  async extract(options) {
    // Call the model, then validate before returning.
    const value = options.schema.parse(await callModel(options));
    return { data: value, model: "my-model", usage: { inputTokens: 0, outputTokens: 0 } };
  },
  async complete(options) {
    const text = await callModel(options);
    return { data: text, model: "my-model", usage: { inputTokens: 0, outputTokens: 0 } };
  },
};

export const myLLM: LLMProvider = {
  id: "my-llm",
  capabilities: {
    structuredOutput: true,
    vision: false,
    webSearch: false,
    batch: false,
  },
  isConfigured: () => Boolean(process.env.MY_LLM_API_KEY),
  createClient: () => client,
};
```

Register and select it in the bootstrap:

```ts
import { registerLLMProvider, selectLLMProvider } from "@dhaga/core";
import { myLLM } from "@your-scope/dhaga-llm";

registerLLMProvider(myLLM);
selectLLMProvider(myLLM.id);
```

Selection can instead use `LLM_PROVIDER=my-llm`. A provider declaring
`batch: true` must also expose `createBatchClient`; invalid registrations fail
at startup.

The built-in `openai` provider accepts `OPENAI_BASE_URL`, so many local or
OpenAI-compatible servers need no plugin. Compatible servers must support the
structured-output behavior used by `extract`, not only basic chat completions.

## Search providers

Search has a deliberately small contract:

```ts
import type { SearchProvider } from "@dhaga/core";

export const searxng: SearchProvider = {
  id: "searxng",
  isConfigured: () => Boolean(process.env.SEARXNG_URL),
  createClient: () => ({
    async search(query, options) {
      // Return normalized { title, url, snippet } records.
      return searchSearxng(query, options?.limit ?? 5);
    },
  }),
};
```

Use `registerSearchProvider`, then either `selectSearchProvider("searxng")`
or `SEARCH_PROVIDER=searxng`.

## Geocoding providers

Geocoding (free-text location → coordinates, for the map view) has the same
shape as search:

```ts
import type { GeocodingProvider } from "@dhaga/core";

export const photon: GeocodingProvider = {
  id: "photon",
  isConfigured: () => Boolean(process.env.PHOTON_URL),
  createClient: () => ({
    async geocode(query) {
      // Return { lat, lng, displayName }, or null for a definitive no-match.
      return geocodePhoton(query);
    },
  }),
};
```

Use `registerGeocodingProvider`, then either `selectGeocodingProvider("photon")`
or `GEOCODING_PROVIDER=photon`.

Two contract rules matter more here than elsewhere:

- Return `null` **only** for a definitive "no such place". Timeouts, HTTP
  errors, and malformed responses must throw — `null` is cached permanently as
  a negative, so returning it for an outage poisons the cache.
- Enforce your provider's rate limit **inside** the client. Callers geocode in
  batches and will not throttle for you. The built-in `nominatim` provider uses
  `createRateLimiter` (`@dhaga/core`) to hold the public instance's 1 req/s
  ceiling; reuse it.

Results are cached in `geocode_cache` keyed by `normalizeLocationQuery(text)`,
shared across tenants — it is public reference data, and one lookup per place
per deployment is what keeps a public geocoder's usage policy satisfied.

## Embedding providers and vector stores

Embedding generation and storage are independent plugins. Their declared
dimensions must match; Dhaga checks this before indexing or searching and
reports both provider ids and dimensions on mismatch.

An `EmbeddingProvider` implements `embedDocuments` and `embedQuery`. A
`VectorStore` implements deterministic upsert, similarity search, existence
checks, and deletion. Owner pairs (`ownerType`, `ownerId`) are stable keys, so
upserts must be idempotent.

Register them with `registerEmbeddingProvider` and `registerVectorStore`, then
select them in code or with:

```dotenv
DHAGA_EMBEDDING_PROVIDER=my-embeddings
DHAGA_VECTOR_STORE=my-vectors
```

`VectorWriteOptions.transaction` is an optional store-specific handle. The
built-in pgvector implementation uses it to keep relational tombstones and
vector deletion atomic. External services cannot participate in a Postgres
transaction and should make deletion idempotent and retry-safe.

The built-ins remain `local-huggingface` (384 dimensions) and `pgvector`.
Setting `DHAGA_VECTOR_STORE` to an external store also skips pgvector extension
and table setup, so the relational database no longer needs that extension.

## Relational database boundary

The application datastore is currently PostgreSQL-compatible, supporting
embedded PGlite and hosted PostgreSQL through the same Drizzle repositories.
It is intentionally not advertised as a generic database plugin: repositories,
full-text indexes, authentication, RLS, and migrations rely on PostgreSQL
semantics. Vector data can be moved to an external engine independently.

## Provider checklist

- Keep vendor SDK imports inside the provider package.
- Validate structured model output with the supplied Zod schema.
- Return normalized usage even when the vendor omits token counts.
- Declare only capabilities that the implementation actually supports.
- Make vector upsert and deletion idempotent.
- Test disabled/unconfigured behavior and malformed provider responses.
- Run `npm run typecheck --prefix packages/core` and the provider registry tests.
