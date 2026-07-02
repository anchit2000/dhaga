import {
  SEARCH_ANSWER_SYSTEM,
  buildSearchAnswerPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { keywordSearch, type SearchHit } from "@/lib/repo/search";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface AiAnswerResult {
  answer?: string;
  notice?: string;
}

function candidateBlocks(hits: SearchHit[]): string {
  return hits
    .slice(0, 10)
    .map((hit) => {
      const identity = [hit.name, hit.title, hit.companyName]
        .filter(Boolean)
        .join(" · ");
      return [`# ${identity}`, ...hit.matches].join("\n");
    })
    .join("\n\n");
}

/** M6 stage 3: compose an answer over keyword candidates (Sonnet), with receipts. */
export async function answerSearchQuery(query: string): Promise<AiAnswerResult> {
  if (!hasLLM()) {
    return { notice: "Set ANTHROPIC_API_KEY to get AI answers over your graph." };
  }
  const hits = await keywordSearch(query);
  if (hits.length === 0) {
    return {
      notice:
        "Nothing in your graph matches those words yet — the AI has no records to reason over.",
    };
  }
  try {
    await assertAiBudget();
    const result = await getLLMClient().complete({
      system: SEARCH_ANSWER_SYSTEM,
      prompt: buildSearchAnswerPrompt(query, candidateBlocks(hits)),
      tier: "reason",
    });
    await recordAiAction("search", result.model, result.usage);
    return { answer: result.data };
  } catch (error) {
    return {
      notice:
        error instanceof AiBudgetError ? error.message : "The AI call failed.",
    };
  }
}
