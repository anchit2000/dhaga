import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMResult,
  ModelTier,
} from "./types";

/**
 * Tier → model mapping per project rules: Haiku for extraction/parsing,
 * Sonnet for search reasoning and drafts.
 */
const TIER_MODELS: Record<ModelTier, string> = {
  extract: "claude-haiku-4-5",
  reason: "claude-sonnet-5",
};

export class AnthropicLLMClient implements LLMClient {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * System prompts are stable strings; marking them as cache breakpoints
   * makes repeat calls read them at ~0.1× input price once they exceed the
   * model's minimum cacheable length (below it the marker is ignored).
   */
  private cachedSystem(system: string) {
    return [
      {
        type: "text" as const,
        text: system,
        cache_control: { type: "ephemeral" as const },
      },
    ];
  }

  async extract<T>(options: ExtractOptions<T>): Promise<LLMResult<T>> {
    const model = TIER_MODELS[options.tier];
    const response = await this.client.messages.parse({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: this.cachedSystem(options.system),
      messages: [{ role: "user", content: options.prompt }],
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

  async complete(options: CompleteOptions): Promise<LLMResult<string>> {
    const model = TIER_MODELS[options.tier];
    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 1024,
      system: this.cachedSystem(options.system),
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
}
