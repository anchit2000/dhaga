import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnthropicLLMClient,
  OpenAILLMClient,
  getBatchLLMClient,
  getLLMClient,
  hasBatchLLM,
  hasLLM,
  registerLLMProvider,
  selectLLMProvider,
  type LLMClient,
} from "@dhaga/core";

afterEach(() => {
  selectLLMProvider(null);
  vi.unstubAllEnvs();
});

describe("LLM gateway provider selection", () => {
  it("keeps Anthropic as the backward-compatible default", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    expect(hasLLM()).toBe(true);
    expect(hasBatchLLM()).toBe(true);
    expect(getLLMClient()).toBeInstanceOf(AnthropicLLMClient);
  });

  it("selects an OpenAI-compatible client without claiming batch support", () => {
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("OPENAI_BASE_URL", "http://localhost:11434/v1");
    vi.stubEnv("OPENAI_EXTRACT_MODEL", "local-vision-model");
    vi.stubEnv("OPENAI_REASON_MODEL", "local-reasoning-model");
    expect(hasLLM()).toBe(true);
    expect(hasBatchLLM()).toBe(false);
    expect(getLLMClient()).toBeInstanceOf(OpenAILLMClient);
    expect(() => getBatchLLMClient()).toThrow(/does not support/);
  });

  it("fails loud for an unknown provider", () => {
    vi.stubEnv("LLM_PROVIDER", "typo-provider");
    expect(() => hasLLM()).toThrow("Unsupported LLM_PROVIDER");
  });

  it("loads an externally registered provider without editing the gateway", () => {
    const client: LLMClient = {
      extract: async (options) => ({
        data: options.schema.parse({ value: "ok" }),
        model: "plugin-model",
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
      complete: async () => ({
        data: "ok",
        model: "plugin-model",
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    };
    const unregister = registerLLMProvider({
      id: "test-plugin",
      capabilities: { structuredOutput: true, vision: false, webSearch: false, batch: false },
      isConfigured: () => true,
      createClient: () => client,
    });
    selectLLMProvider("test-plugin");

    expect(hasLLM()).toBe(true);
    expect(hasBatchLLM()).toBe(false);
    expect(getLLMClient()).toBe(client);
    unregister();
  });

  it("rejects an invalid batch capability declaration", () => {
    expect(() =>
      registerLLMProvider({
        id: "broken-batch-plugin",
        capabilities: { structuredOutput: true, vision: false, webSearch: false, batch: true },
        isConfigured: () => true,
        createClient: () => ({}) as LLMClient,
      }),
    ).toThrow(/createBatchClient/);
  });
});
