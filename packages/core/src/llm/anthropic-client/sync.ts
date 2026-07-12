import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { CompleteOptions, ExtractOptions, LLMResult } from "../types";
import { cachedSystem, TIER_MODELS } from "./shared";

/** Synchronous single-request extraction — the original extract() body, unchanged. */
export async function runExtract<T>(
  client: Anthropic,
  options: ExtractOptions<T>,
): Promise<LLMResult<T>> {
  const model = TIER_MODELS[options.tier];
  const content: Anthropic.ContentBlockParam[] = [
    ...(options.images ?? []).map(
      (image): Anthropic.ImageBlockParam => ({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.dataBase64,
        },
      }),
    ),
    { type: "text", text: options.prompt },
  ];
  const response = await client.messages.parse({
    model,
    max_tokens: options.maxTokens ?? 2048,
    system: cachedSystem(options.system),
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(options.schema) },
  });
  if (response.parsed_output == null) {
    throw new Error("Structured output did not match the expected schema");
  }
  return {
    data: response.parsed_output,
    model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/** Synchronous free-text completion — the original complete() body, unchanged. */
export async function runComplete(
  client: Anthropic,
  options: CompleteOptions,
): Promise<LLMResult<string>> {
  const model = TIER_MODELS[options.tier];
  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 1024,
    system: cachedSystem(options.system),
    messages: [{ role: "user", content: options.prompt }],
    tools: options.webSearch
      ? [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }]
      : undefined,
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return {
    data: text,
    model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
