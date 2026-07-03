import { AnthropicLLMClient } from "./anthropic-client";
import type { LLMClient } from "./types";

export type {
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMResult,
  LLMUsage,
  ModelTier,
} from "./types";
export { AnthropicLLMClient } from "./anthropic-client";
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

/** True when a cloud LLM is configured; features degrade gracefully when not. */
export function hasLLM(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Factory — the only place a concrete provider is chosen. BYO-key and
 * local-model (Ollama) providers plug in here later without touching callers.
 */
export function getLLMClient(): LLMClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — cloud AI features are unavailable",
    );
  }
  return new AnthropicLLMClient(apiKey);
}
