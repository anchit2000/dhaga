import { beforeEach, describe, expect, it } from "vitest";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import { aiCreditsUsedThisMonth, recordAiAction, withAiAction } from "@/lib/ai/metering";
import { actionCount, actionRows, clearActions } from "./helpers";

beforeEach(clearActions);

describe("AI metering is charged per action, not per model call", () => {
  it("folds every model call of one action into a single row that sums their usage", async () => {
    await withAiAction("card_scan", async () => {
      // The scan itself…
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1733,
        outputTokens: 99,
      });
      // …and the verbatim transcription that finishes it off.
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1198,
        outputTokens: 159,
      });
    });

    const rows = await actionRows();
    expect(rows).toHaveLength(1);
    // Cost stays truthful: both calls' tokens are on the one action.
    expect(rows[0]?.inputTokens).toBe(1733 + 1198);
    expect(rows[0]?.outputTokens).toBe(99 + 159);
    // And the user is charged for the one thing they did.
    expect(await aiCreditsUsedThisMonth()).toBe(AI_ACTION_CREDITS.card_scan);
  });

  it("bills a nested action as part of the action the user actually asked for", async () => {
    // Enrichment is a web search plus a note extraction. The user asked to
    // enrich a contact — not to run two models — so the inner extraction must
    // join the open action rather than bill a second, differently-priced one.
    await withAiAction("enrichment", async () => {
      await recordAiAction("enrichment", "claude-sonnet-5", {
        inputTokens: 156,
        outputTokens: 2189,
      });
      await withAiAction("note_extraction", async () => {
        await recordAiAction("note_extraction", "claude-haiku-4-5", {
          inputTokens: 2791,
          outputTokens: 382,
        });
      });
    });

    const rows = await actionRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.feature).toBe("enrichment");
    expect(rows[0]?.inputTokens).toBe(156 + 2791);
    expect(await aiCreditsUsedThisMonth()).toBe(AI_ACTION_CREDITS.enrichment);
  });

  it("keeps unscoped calls as separate actions, so pre-scope history still counts", async () => {
    await recordAiAction("contact_parse", "claude-haiku-4-5", {
      inputTokens: 10,
      outputTokens: 1,
    });
    await recordAiAction("contact_parse", "claude-haiku-4-5", {
      inputTokens: 10,
      outputTokens: 1,
    });

    expect(await actionCount()).toBe(2);
    expect(await aiCreditsUsedThisMonth()).toBe(2 * AI_ACTION_CREDITS.contact_parse);
  });

  it("does not spend the user's credits on nightly watchlist scans", async () => {
    // The watchlist has its own throttle (PRO_TIER_WATCHLIST_CAP). Charging it
    // credits too would quietly eat a month's allowance for work the user never
    // asked for on any particular night.
    for (let i = 0; i < 25; i++) {
      await recordAiAction("signal_detection", "claude-haiku-4-5", {
        inputTokens: 1090,
        outputTokens: 117,
      });
    }
    expect(await actionCount()).toBe(25);
    expect(await aiCreditsUsedThisMonth()).toBe(0);
  });
});
