import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import type { BatchExtractItem, BatchExtractResult } from "../types";
import { cachedSystem, TIER_MODELS } from "./shared";

/**
 * One Message Batch request per item, `custom_id` = the caller's `id`.
 * `output_config` is a normal Messages API param (`MessageCreateParamsBase`)
 * so it's accepted here the same as in runExtract() — but there is no batch
 * equivalent of `messages.parse()`, so results come back unparsed; see
 * runGetBatchResults, which parses each one with the same zodOutputFormat.
 */
export async function runSubmitExtractBatch<T>(
  client: Anthropic,
  items: BatchExtractItem<T>[],
): Promise<string> {
  const batch = await client.messages.batches.create({
    requests: items.map((item) => ({
      custom_id: item.id,
      params: {
        model: TIER_MODELS[item.tier],
        max_tokens: item.maxTokens ?? 2048,
        system: cachedSystem(item.system),
        messages: [{ role: "user" as const, content: item.prompt }],
        output_config: { format: zodOutputFormat(item.schema) },
      },
    })),
  });
  return batch.id;
}

/** `processing_status` moves in_progress → canceling → ended; "ended" is the only state where results are ready. */
export async function runIsBatchDone(client: Anthropic, batchId: string): Promise<boolean> {
  const batch = await client.messages.batches.retrieve(batchId);
  return batch.processing_status === "ended";
}

export async function runGetBatchResults<T>(
  client: Anthropic,
  batchId: string,
  schema: ZodType<T>,
): Promise<BatchExtractResult<T>[]> {
  const format = zodOutputFormat(schema);
  const results: BatchExtractResult<T>[] = [];
  for await (const line of await client.messages.batches.results(batchId)) {
    if (line.result.type !== "succeeded") {
      results.push({ id: line.custom_id, status: line.result.type });
      continue;
    }
    const message = line.result.message;
    const text = message.content.find((block) => block.type === "text")?.text ?? "";
    try {
      results.push({
        id: line.custom_id,
        status: "succeeded",
        data: format.parse(text),
        model: message.model,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      });
    } catch {
      // Model output didn't match the schema — same failure mode extract()
      // throws synchronously; here it just downgrades this one result.
      results.push({ id: line.custom_id, status: "errored" });
    }
  }
  return results;
}
