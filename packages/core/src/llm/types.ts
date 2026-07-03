import type { ZodType } from "zod";

/**
 * Model tiers, not model names: callers say what kind of work this is,
 * the client implementation maps it to a concrete model. Adding a local
 * (Ollama) or BYO-key provider means a new LLMClient implementation —
 * zero changes to callers (Dependency Inversion).
 */
export type ModelTier = "extract" | "reason";

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResult<T> {
  data: T;
  model: string;
  usage: LLMUsage;
}

export interface ExtractOptions<T> {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  tier: ModelTier;
  maxTokens?: number;
}

export interface CompleteOptions {
  system: string;
  prompt: string;
  tier: ModelTier;
  maxTokens?: number;
  /** Allow the provider's server-side web search (user-triggered features only). */
  webSearch?: boolean;
}

export interface LLMClient {
  /** Structured extraction — output is guaranteed to match the Zod schema. */
  extract<T>(options: ExtractOptions<T>): Promise<LLMResult<T>>;
  /** Free-text completion (drafts, search answers). */
  complete(options: CompleteOptions): Promise<LLMResult<string>>;
}
