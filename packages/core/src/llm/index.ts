import { AnthropicLLMClient } from "./anthropic-client";
import { OpenAILLMClient } from "./openai-client";
import type { BatchLLMClient, LLMClient, LLMProvider } from "./types";

export type {
  BatchExtractItem,
  BatchExtractResult,
  BatchLLMClient,
  BatchResultStatus,
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMImage,
  LLMResult,
  LLMUsage,
  LLMProvider,
  LLMProviderCapabilities,
  ModelTier,
} from "./types";
export { AnthropicLLMClient } from "./anthropic-client";
export { OpenAILLMClient, type OpenAILLMClientOptions } from "./openai-client";
export {
  CONTACT_PARSE_SYSTEM,
  buildContactParsePrompt,
} from "./prompts/contact-parse";
export {
  NOTE_EXTRACTION_SYSTEM,
  buildNoteExtractionPrompt,
} from "./prompts/note-extraction";
export {
  SEARCH_ANSWER_SYSTEM,
  SEARCH_QUERY_SYSTEM,
  buildSearchAnswerPrompt,
  buildSearchQueryPrompt,
} from "./prompts/search";
export {
  DRAFT_SYSTEM,
  buildDraftPrompt,
  type DraftContext,
} from "./prompts/draft";
export {
  ENRICHMENT_SYSTEM,
  buildEnrichmentPrompt,
  type EnrichmentSubject,
} from "./prompts/enrichment";
export {
  BRIEF_SYSTEM,
  buildBriefPrompt,
  type BriefContext,
} from "./prompts/brief";
export { CARD_SCAN_SYSTEM, CARD_SCAN_PROMPT } from "./prompts/card-scan";

const providerStore = globalThis as unknown as {
  __dhagaLLMProviders?: Map<string, LLMProvider>;
  __dhagaLLMProviderOverride?: string;
};

function llmProviders(): Map<string, LLMProvider> {
  providerStore.__dhagaLLMProviders ??= new Map();
  const providers = providerStore.__dhagaLLMProviders;
  if (!providers.has("anthropic")) {
    providers.set("anthropic", {
      id: "anthropic",
      capabilities: {
        structuredOutput: true,
        vision: true,
        webSearch: true,
        batch: true,
      },
      isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
      createClient: () => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — cloud AI features are unavailable");
        return new AnthropicLLMClient(apiKey);
      },
      createBatchClient: () => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — cloud AI features are unavailable");
        return new AnthropicLLMClient(apiKey);
      },
    });
  }
  if (!providers.has("openai")) {
    providers.set("openai", {
      id: "openai",
      capabilities: {
        structuredOutput: true,
        vision: true,
        webSearch: !process.env.OPENAI_BASE_URL,
        batch: false,
      },
      isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
      createClient: () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY is not set — cloud AI features are unavailable");
        return new OpenAILLMClient({
          apiKey,
          baseURL: process.env.OPENAI_BASE_URL || undefined,
          extractModel: process.env.OPENAI_EXTRACT_MODEL || "gpt-4.1-mini",
          reasonModel: process.env.OPENAI_REASON_MODEL || "gpt-4.1",
        });
      },
    });
  }
  return providers;
}

/** Register an LLM supplied by this app or an external package. */
export function registerLLMProvider(provider: LLMProvider): () => void {
  if (!provider.id.trim()) throw new Error("LLM provider id cannot be empty");
  if (provider.capabilities.batch && !provider.createBatchClient) {
    throw new Error(`LLM provider "${provider.id}" declares batch support without createBatchClient()`);
  }
  llmProviders().set(provider.id, provider);
  return () => llmProviders().delete(provider.id);
}

/** Select a registered provider programmatically; pass null to use LLM_PROVIDER. */
export function selectLLMProvider(id: string | null): void {
  providerStore.__dhagaLLMProviderOverride = id ?? undefined;
}

export function getLLMProvider(): LLMProvider {
  const id = providerStore.__dhagaLLMProviderOverride || process.env.LLM_PROVIDER || "anthropic";
  const provider = llmProviders().get(id);
  if (!provider) throw new Error(`Unsupported LLM_PROVIDER: ${id}`);
  return provider;
}

/** True when an LLM is configured; features degrade gracefully when not. */
export function hasLLM(): boolean {
  return getLLMProvider().isConfigured();
}

export function hasBatchLLM(): boolean {
  const provider = getLLMProvider();
  return provider.capabilities.batch && provider.isConfigured();
}

/**
 * Factory — the only place a concrete provider is chosen. BYO-key and
 * local-model (Ollama) providers plug in here later without touching callers.
 */
export function getLLMClient(): LLMClient {
  return getLLMProvider().createClient();
}

/**
 * Batch-capable factory (Interface Segregation — see BatchLLMClient's doc
 * comment in ./types): only for callers that specifically need async batch
 * submission, e.g. the nightly signal-detection job. Anthropic is the only
 * provider that implements it today; a future Ollama/BYO-key LLMClient
 * wouldn't need to.
 */
export function getBatchLLMClient(): BatchLLMClient {
  const provider = getLLMProvider();
  if (!provider.capabilities.batch || !provider.createBatchClient) {
    throw new Error("The configured LLM provider does not support asynchronous batches");
  }
  return provider.createBatchClient();
}
