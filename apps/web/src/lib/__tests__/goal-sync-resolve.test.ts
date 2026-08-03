import { describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { getActiveGoalProgress } from "@/lib/repo/goals";
import { archiveGoalAction, saveGoalAction } from "@/lib/actions/goals";
import { resolveGoalNow } from "@/lib/ai/goal-resolve";
import { RATE_LIMITS } from "@/utils/constants/ratelimit";
import type { LLMResult } from "@dhaga/core";

/**
 * Stating a goal used to kick off NOTHING: runGoalMatching had one caller, the
 * nightly cron, so the Home strip sat on "Finding people" for up to 24 hours —
 * and forever on a box with no cron. A user reported it as a hang.
 *
 * These tests pin the two properties that fix it and the one that must not be
 * broken while fixing it:
 *   1. saving a goal fills its cohort THERE AND THEN, with no job run;
 *   2. a pass that matched nobody is recorded as having run, so the strip can
 *      say so instead of claiming to still be searching;
 *   3. NO scoped DB connection is held across the model call — the tenant pool
 *      caps at 3 and a connection held across an LLM stream took out /app in
 *      production (PR #92). That one is asserted directly: withUserDb is
 *      wrapped to count open scopes, and the fake model records the count it
 *      sees. It must be zero.
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

// Counts scopes rather than replacing them: the REAL withUserDb still runs, so
// this measures the actual nesting the resolve produces.
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

// No real Anthropic client is ever constructed: a network call would fail
// loudly rather than bill anyone.
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

describe("a goal resolves on save, not on the nightly cron", () => {
  it("fills the cohort during the save, with the nightly job never running", async () => {
    await createContact(person("Rosalind Vartanian", "Kombucha Brewmaster"), "manual");
    extractCalls = 0;
    scopesDuringModelCall = [];
    verdict = { matches: true, fit: 90 };

    const saved = await saveGoalAction(form("Kombucha Brewmaster"));
    expect(saved.ok).toBe(true);

    // runGoalMatching was NOT called anywhere in this test — the cohort exists
    // purely because the save resolved it.
    const progress = await getActiveGoalProgress();
    expect(extractCalls).toBeGreaterThan(0);
    expect(progress?.total).toBeGreaterThan(0);
    expect(progress?.state).toBe("matched");
    expect(progress?.lastMatchedAt).not.toBeNull();
  });

  it("holds no scoped DB connection across the model call", async () => {
    // The regression this guards is invisible in output — the cohort is built
    // correctly either way, and the failure only shows up as pool exhaustion
    // under load. So it is asserted structurally, at the moment of the call.
    expect(scopesDuringModelCall.length).toBeGreaterThan(0);
    expect(scopesDuringModelCall.every((depth) => depth === 0)).toBe(true);
  });

  it("records a pass that matched nobody, so the strip can say so", async () => {
    await createContact(person("Yusuf Adeyemi", "Ceramics Kiln Technician"), "manual");
    // A reword keeps the old cohort on purpose (write.ts), so the empty case
    // needs a genuinely new goal — the user closing one and stating the next.
    await archiveGoalAction();
    verdict = { matches: false, fit: 0 };
    extractCalls = 0;

    await saveGoalAction(form("Ceramics Kiln Technician"));

    const progress = await getActiveGoalProgress();
    expect(extractCalls).toBeGreaterThan(0);
    // "Searched, nobody matched" — the state that used to be indistinguishable
    // from "never searched", which is what left the tile searching forever.
    expect(progress?.total).toBe(0);
    expect(progress?.state).toBe("no_matches");
    expect(progress?.lastMatchedAt).not.toBeNull();
    verdict = { matches: true, fit: 90 };
  });

  it("does not re-judge anyone when the objective is saved unchanged", async () => {
    extractCalls = 0;
    await saveGoalAction(form("Ceramics Kiln Technician"));
    // Same words, same candidates, same verdicts — and a slot in a 3-a-day
    // fuse that a user rewording their goal actually needs.
    expect(extractCalls).toBe(0);
  });

  it("stops an edit-save loop at the daily fuse", async () => {
    // Its own user id: the bucket is keyed per user, and the saves above have
    // already spent points for theirs.
    const attempts: (string | null)[] = [];
    for (let i = 0; i <= RATE_LIMITS.goal_resolve.points; i += 1) {
      const outcome = await resolveGoalNow("goal-fuse-user", "goal-that-does-not-exist", `try ${i}`);
      attempts.push(outcome.skipped);
    }
    // `goal_matching` is priced at 0 credits, so the monthly AI cap does not
    // bound this path — the fuse is the ONLY thing between an edit loop and an
    // unbounded per-resolve spend.
    expect(attempts.slice(0, RATE_LIMITS.goal_resolve.points)).not.toContain("rate_limited");
    expect(attempts[RATE_LIMITS.goal_resolve.points]).toBe("rate_limited");
  });
});
