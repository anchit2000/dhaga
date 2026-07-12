import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type {
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMResult,
  ModelTier,
} from "./types";

export interface OpenAILLMClientOptions {
  apiKey: string;
  baseURL?: string;
  extractModel: string;
  reasonModel: string;
}

export class OpenAILLMClient implements LLMClient {
  private readonly client: OpenAI;
  private readonly models: Record<ModelTier, string>;
  private readonly hasCustomBaseURL: boolean;

  constructor(options: OpenAILLMClientOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    this.models = { extract: options.extractModel, reason: options.reasonModel };
    this.hasCustomBaseURL = Boolean(options.baseURL);
  }

  async extract<T>(options: ExtractOptions<T>): Promise<LLMResult<T>> {
    const model = this.models[options.tier];
    const content: OpenAI.ChatCompletionContentPart[] = [
      ...(options.images ?? []).map(
        (image): OpenAI.ChatCompletionContentPartImage => ({
          type: "image_url",
          image_url: { url: `data:${image.mediaType};base64,${image.dataBase64}` },
        }),
      ),
      { type: "text", text: options.prompt },
    ];
    const response = await this.client.chat.completions.parse({
      model,
      max_completion_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content },
      ],
      response_format: zodResponseFormat(options.schema, "extraction"),
    });
    const parsed = response.choices[0]?.message.parsed;
    if (parsed == null) {
      throw new Error("Structured output did not match the expected schema");
    }
    return {
      data: options.schema.parse(parsed),
      model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async complete(options: CompleteOptions): Promise<LLMResult<string>> {
    const model = this.models[options.tier];
    if (options.webSearch) return this.completeWithWebSearch(model, options);
    const response = await this.client.chat.completions.create({
      model,
      max_completion_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
    });
    return {
      data: response.choices[0]?.message.content ?? "",
      model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  private async completeWithWebSearch(
    model: string,
    options: CompleteOptions,
  ): Promise<LLMResult<string>> {
    if (this.hasCustomBaseURL) {
      throw new Error("Web search is not portable across custom OpenAI-compatible URLs");
    }
    const response = await this.client.responses.create({
      model,
      max_output_tokens: options.maxTokens ?? 1024,
      instructions: options.system,
      input: options.prompt,
      tools: [{ type: "web_search" }],
    });
    return {
      data: response.output_text,
      model,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}
