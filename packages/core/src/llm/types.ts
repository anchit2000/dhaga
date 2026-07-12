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

export interface LLMImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
}

export interface ExtractOptions<T> {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  tier: ModelTier;
  maxTokens?: number;
  /** Optional images placed before the prompt text (card/badge photos). */
  images?: LLMImage[];
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

export interface BatchExtractItem<T> extends Omit<ExtractOptions<T>, "images"> {
  /**
   * Caller-chosen id, echoed back on the matching result — how a caller maps
   * a result back to whatever it was for (e.g. a contact id). Becomes the
   * batch request's `custom_id`; must match `^[a-zA-Z0-9_-]{1,64}$`.
   */
  id: string;
}

export type BatchResultStatus = "succeeded" | "errored" | "expired" | "canceled";

export interface BatchExtractResult<T> {
  id: string;
  status: BatchResultStatus;
  /** Present only when status is "succeeded". */
  data?: T;
  model?: string;
  usage?: LLMUsage;
}

/**
 * Capability interface for providers that support async batch submission
 * (Anthropic's Message Batches API — ~50% cheaper, built for exactly the
 * "nightly/latency-insensitive jobs" CLAUDE.md calls out). Kept separate
 * from LLMClient (Interface Segregation): a future local-model provider
 * (Ollama/BYO-key) may implement extract/complete with no batch endpoint at
 * all, so callers that specifically need batching depend on this narrower
 * interface instead of forcing it onto every LLMClient implementation.
 */
export interface BatchLLMClient {
  /**
   * Submit many extract-shaped requests as one batch. Returns immediately
   * with a batch id — does not wait for completion (a batch can take
   * anywhere from minutes up to 24 hours).
   */
  submitExtractBatch<T>(items: BatchExtractItem<T>[]): Promise<string>;
  /** True once every request in the batch has succeeded, errored, expired, or been canceled — only then is getBatchResults safe to call. */
  isBatchDone(batchId: string): Promise<boolean>;
  /** One entry per submitted item, in no particular order — match results to requests via `id`. Only valid once isBatchDone() is true. */
  getBatchResults<T>(batchId: string, schema: ZodType<T>): Promise<BatchExtractResult<T>[]>;
}
