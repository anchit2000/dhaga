import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import {
  AiBudgetError,
  aiCreditsUsedThisMonth,
  assertAiBudget,
  recordAiAction,
  withAiAction,
} from "@/lib/ai/metering";
import { clearActions } from "./helpers";

const originalCap = process.env.DHAGA_AI_MONTHLY_CAP;

beforeEach(clearActions);

afterEach(() => {
  if (originalCap === undefined) delete process.env.DHAGA_AI_MONTHLY_CAP;
  else process.env.DHAGA_AI_MONTHLY_CAP = originalCap;
});

describe("the monthly cap counts actions, not calls", () => {
  it("admits every later call of an action it already admitted", async () => {
    process.env.DHAGA_AI_MONTHLY_CAP = "1";

    // A user with exactly one credit left starts a card scan. Before the fix
    // the first call passed and the SECOND was refused mid-action — they were
    // billed for a scan they never received.
    await withAiAction("card_scan", async () => {
      await assertAiBudget("user-1");
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1733,
        outputTokens: 99,
      });
      await expect(assertAiBudget("user-1")).resolves.toBeUndefined();
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1198,
        outputTokens: 159,
      });
    });

    expect(await aiCreditsUsedThisMonth()).toBe(1);
    // The cap is still real: the NEXT action is refused.
    await expect(
      withAiAction("card_scan", () => assertAiBudget("user-1")),
    ).rejects.toBeInstanceOf(AiBudgetError);
  });

  it("charges an expensive action its full credit price against the cap", async () => {
    process.env.DHAGA_AI_MONTHLY_CAP = "25";

    await withAiAction("enrichment", async () => {
      await assertAiBudget("user-1");
      await recordAiAction("enrichment", "claude-sonnet-5", {
        inputTokens: 156,
        outputTokens: 2189,
      });
    });

    // One enrichment is 20 credits, so a 25-credit month has 5 left — enough
    // for cheap actions, not for a second deep-research run.
    expect(await aiCreditsUsedThisMonth()).toBe(AI_ACTION_CREDITS.enrichment);
    await expect(
      withAiAction("card_scan", () => assertAiBudget("user-1")),
    ).resolves.toBeUndefined();

    await withAiAction("enrichment", async () => {
      await recordAiAction("enrichment", "claude-sonnet-5", {
        inputTokens: 156,
        outputTokens: 2189,
      });
    });
    await expect(
      withAiAction("card_scan", () => assertAiBudget("user-1")),
    ).rejects.toBeInstanceOf(AiBudgetError);
  });
});
