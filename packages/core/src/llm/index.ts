import { AnthropicLLMClient } from "./anthropic-client";
import { OpenAILLMClient } from "./openai-client";
import type { BatchLLMClient, LLMClient } from "./types";

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

/** True when a cloud LLM is configured; features degrade gracefully when not. */
export function hasLLM(): boolean {
  return getLLMProvider() === "openai"
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasBatchLLM(): boolean {
  return getLLMProvider() === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Factory — the only place a concrete provider is chosen. BYO-key and
 * local-model (Ollama) providers plug in here later without touching callers.
 */
export function getLLMClient(): LLMClient {
  if (getLLMProvider() === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set — cloud AI features are unavailable");
    }
    return new OpenAILLMClient({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      extractModel: process.env.OPENAI_EXTRACT_MODEL || "gpt-4.1-mini",
      reasonModel: process.env.OPENAI_REASON_MODEL || "gpt-4.1",
    });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — cloud AI features are unavailable",
    );
  }
  return new AnthropicLLMClient(apiKey);
}

/**
 * Batch-capable factory (Interface Segregation — see BatchLLMClient's doc
 * comment in ./types): only for callers that specifically need async batch
 * submission, e.g. the nightly signal-detection job. Anthropic is the only
 * provider that implements it today; a future Ollama/BYO-key LLMClient
 * wouldn't need to.
 */
export function getBatchLLMClient(): BatchLLMClient {
  if (getLLMProvider() !== "anthropic") {
    throw new Error("The configured LLM provider does not support asynchronous batches");
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — cloud AI features are unavailable",
    );
  }
  return new AnthropicLLMClient(apiKey);
}

function getLLMProvider(): "anthropic" | "openai" {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  if (provider !== "anthropic" && provider !== "openai") {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
  }
  return provider;
}
