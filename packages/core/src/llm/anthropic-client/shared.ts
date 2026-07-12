import type Anthropic from "@anthropic-ai/sdk";
import type { ModelTier } from "../types";

/**
 * Tier → model mapping per project rules: Haiku for extraction/parsing,
 * Sonnet for search reasoning and drafts.
 */
export const TIER_MODELS: Record<ModelTier, string> = {
  extract: "claude-haiku-4-5",
  reason: "claude-sonnet-5",
};

/**
 * System prompts are stable strings; marking them as cache breakpoints
 * makes repeat calls read them at ~0.1× input price once they exceed the
 * model's minimum cacheable length (below it the marker is ignored).
 */
export function cachedSystem(system: string): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text" as const,
      text: system,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}
