import { describe, expect, it, vi } from "vitest";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { getActiveGoalProgress } from "@/lib/repo/goals";
import { archiveGoalAction, requestGoalMatchAction, saveGoalAction } from "@/lib/actions/goals";
import { actionRows } from "./ai-action-metering/helpers";
import type { LLMResult } from "@dhaga/core";

/**
 * Matching is NIGHTLY BY DEFAULT and PAID ON DEMAND.
 *
 * Saving a goal used to resolve its cohort inline, spending ~$0.019 of
 * inference on every save — money the user never chose to spend, on a wait they
 * never asked for. Saving is now a plain DB write; "Request now" buys the same
 * match for credits, billed as the priced `goal_match_now` and not the free
 * nightly `goal_matching`, which is what makes the allowance the fuse now that
 * the day-long rate limit is gone. Each `it` pins one of those.
 *
 * Keep the pool test whatever else changes: the tenant pool caps at 3 and a
 * connection held across an LLM stream took out /app in production (PR #92).
 */

let openScopes = 0;
let scopesDuringModelCall: number[] = [];
let extractCalls = 0;
let verdict = { matches: true, fit: 90 };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null, // request-scope falls back to the default (unscoped) db
  requireUserId: async () => "goal-resolve-user",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Counts scopes rather than replacing them: the REAL withUserDb still runs.
vi.mock("@/lib/db/request-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/request-scope")>();
  return {
    ...actual,
    withUserDb: async <T,>(userId: string, work: () => Promise<T>): Promise<T> => {
      openScopes += 1;
      try {
        return await actual.withUserDb(userId, work);
      } finally {
        openScopes -= 1;
      }
    },
  };
});

// No real Anthropic client is ever constructed — a network call would fail
// loudly rather than bill anyone. `AI_ACTION_CREDITS` stays the real table.
vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  return {
    ...actual,
    hasLLM: () => true,
    getLLMClient: () => ({
      extract: async <T,>(): Promise<LLMResult<T>> => {
        extractCalls += 1;
        scopesDuringModelCall.push(openScopes);
        return {
          data: verdict as unknown as T,
          model: "claude-haiku-4-5",
          usage: { inputTokens: 720, outputTokens: 45 },
        };
      },
    }),
  };
});

function form(objective: string): FormData {
  const fd = new FormData();
  fd.set("objective", objective);
  return fd;
}

function person(name: string, title: string) {
  return { name, title, company: null, emails: [], phones: [], links: [], location: null };
}

describe("matching is nightly by default and paid on demand", () => {
  it("saves a goal without calling the model at all", async () => {
    await createContact(person("Rosalind Vartanian", "Kombucha Brewmaster"), "manual");
    extractCalls = 0;
    scopesDuringModelCall = [];
    verdict = { matches: true, fit: 90 };
    const saved = await saveGoalAction(form("Kombucha Brewmaster"));
    expect(saved.ok).toBe(true);
    // THE POINT OF THE CHANGE: stating a goal is free and instant. A single
    // model call here is money the user did not agree to spend.
    expect(extractCalls).toBe(0);
    const progress = await getActiveGoalProgress();
    expect(progress?.total).toBe(0);
    // "unresolved" = the strip's "matching runs tonight", not a finished pass.
    expect(progress?.state).toBe("unresolved");
    expect(progress?.lastMatchedAt).toBeNull();
  });

  it("fills the cohort when the user asks for it now, with no job run", async () => {
    // runGoalMatching is never called: the cohort exists purely because the
    // user pressed Request now.
    const requested = await requestGoalMatchAction();
    expect(requested.ok).toBe(true);
    const progress = await getActiveGoalProgress();
    expect(extractCalls).toBeGreaterThan(0);
    expect(progress?.total).toBeGreaterThan(0);
    expect(progress?.state).toBe("matched");
    expect(progress?.lastMatchedAt).not.toBeNull();
  });

  it("bills the request as goal_match_now, not as the free nightly pass", async () => {
    // Why it is its own feature: `goal_matching` is priced at 0 (an unasked-for
    // nightly sweep), so metering this run under that name would hand every user
    // unlimited free on-demand matching, and hide which path spent the money.
    const rows = await actionRows();
    const requested = rows.filter((row) => row.feature === "goal_match_now");
    expect(requested).toHaveLength(1); // one action, however many it judged
    expect(rows.some((row) => row.feature === "goal_matching")).toBe(false);
    // Priced, not free — the credit allowance is the only fuse on this path now.
    expect(AI_ACTION_CREDITS.goal_match_now).toBeGreaterThan(0);
    expect(requested[0]?.inputTokens).toBeGreaterThanOrEqual(720);
  });

  it("holds no scoped DB connection across the model call", async () => {
    // Invisible in output — the cohort is built correctly either way and it
    // only shows up as pool exhaustion under load — so assert it structurally.
    expect(scopesDuringModelCall.length).toBeGreaterThan(0);
    expect(scopesDuringModelCall.every((depth) => depth === 0)).toBe(true);
  });

  it("records a pass that matched nobody, so the strip can say so", async () => {
    await createContact(person("Yusuf Adeyemi", "Ceramics Kiln Technician"), "manual");
    // A reword keeps the old cohort (write.ts), so this needs a NEW goal.
    await archiveGoalAction();
    verdict = { matches: false, fit: 0 };
    extractCalls = 0;
    await saveGoalAction(form("Ceramics Kiln Technician"));
    await requestGoalMatchAction();
    const progress = await getActiveGoalProgress();
    expect(extractCalls).toBeGreaterThan(0);
    // "Searched, nobody matched" — once indistinguishable from "never
    // searched", which is what left the tile searching forever.
    expect(progress?.total).toBe(0);
    expect(progress?.state).toBe("no_matches");
    expect(progress?.lastMatchedAt).not.toBeNull();
    verdict = { matches: true, fit: 90 };
  });
});
