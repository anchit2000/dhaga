import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import type {
  BatchExtractItem,
  BatchExtractResult,
  BatchLLMClient,
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMResult,
} from "../types";
import { runGetBatchResults, runIsBatchDone, runSubmitExtractBatch } from "./batch";
import { runComplete, runExtract } from "./sync";

/**
 * Split per the 150-line rule: request-building and response-parsing live
 * in ./sync (extract/complete) and ./batch (the Message Batches API —
 * CLAUDE.md's "Nightly/latency-insensitive jobs: Batch API" rule). This
 * class just owns the SDK client and satisfies both gateway interfaces so
 * callers keep depending on LLMClient / BatchLLMClient, never on this class
 * directly (Dependency Inversion).
 */
export class AnthropicLLMClient implements LLMClient, BatchLLMClient {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  extract<T>(options: ExtractOptions<T>): Promise<LLMResult<T>> {
    return runExtract(this.client, options);
  }

  complete(options: CompleteOptions): Promise<LLMResult<string>> {
    return runComplete(this.client, options);
  }

  submitExtractBatch<T>(items: BatchExtractItem<T>[]): Promise<string> {
    return runSubmitExtractBatch(this.client, items);
  }

  isBatchDone(batchId: string): Promise<boolean> {
    return runIsBatchDone(this.client, batchId);
  }

  getBatchResults<T>(batchId: string, schema: ZodType<T>): Promise<BatchExtractResult<T>[]> {
    return runGetBatchResults(this.client, batchId, schema);
  }
}
