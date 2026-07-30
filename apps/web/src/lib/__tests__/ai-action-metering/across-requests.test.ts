import { beforeEach, describe, expect, it } from "vitest";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import {
  aiCreditsUsedThisMonth,
  currentAiActionId,
  recordAiAction,
  withAiAction,
} from "@/lib/ai/metering";
import { actionCount, actionRows, clearActions } from "./helpers";

beforeEach(clearActions);

/**
 * The card scan is the one action the in-process scope cannot hold together:
 * the fields come back in the SCAN request, and the verbatim transcription only
 * runs after the user saves — a second HTTP request, minutes later if they edit
 * the form first. AsyncLocalStorage is long gone by then, so the scan hands its
 * action id to the client (`QuickAddState.scanActionId`), which hands it back on
 * save (`scheduleCardTranscription`). Lose that thread and a scan silently bills
 * two credits while the pricing page promises one.
 */
describe("an action that spans two requests", () => {
  it("rejoins the scan's action when the transcription runs in the save request", async () => {
    const scanned = await withAiAction("card_scan", async () => {
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1733,
        outputTokens: 99,
      });
      return currentAiActionId();
    });
    expect(scanned).toBeTruthy();

    // …the save request, with nothing but the id to go on.
    await withAiAction({ feature: "card_scan", id: scanned as string }, async () => {
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1198,
        outputTokens: 159,
      });
    });

    const rows = await actionRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.inputTokens).toBe(1733 + 1198);
    expect(await aiCreditsUsedThisMonth()).toBe(AI_ACTION_CREDITS.card_scan);
  });

  it("bills its own action when the id is missing, rather than going unmetered", async () => {
    // An older client, or a caller that never went through the review form.
    // Losing the thread must cost the user a credit — not cost us an untracked
    // model call.
    await withAiAction("card_scan", async () => {
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1198,
        outputTokens: 159,
      });
    });

    expect(await actionCount()).toBe(1);
    expect(await aiCreditsUsedThisMonth()).toBe(AI_ACTION_CREDITS.card_scan);
  });
});
