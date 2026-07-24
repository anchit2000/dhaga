import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { generateFollowUpDraft } from "@/lib/ai/draft";
import { generateBrief } from "@/lib/ai/brief";
import type { LLMClient, LLMResult } from "@dhaga/core";

/**
 * enrich.ts already treats a blank LLM completion as a failure ("Enrichment
 * returned nothing.") rather than a silent success, because the model can
 * come back with nothing usable (empty turn, refusal, truncation) even
 * though the metered AI action already happened. draft.ts and brief.ts run
 * the exact same `complete()` shape and must fail the same way: without
 * this guard, a blank response is reported as `{ draft: "" }` / `{ brief: "" }`,
 * which both UIs (DraftSection/BriefSection) treat as "nothing generated
 * yet" — the user burns one of their paid monthly AI actions and sees no
 * error, indistinguishable from never having clicked the button.
 */
vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  const blankClient: LLMClient = {
    extract: async () => {
      throw new Error("extract() is not exercised by this test");
    },
    complete: async (): Promise<LLMResult<string>> => ({
      data: "   \n",
      model: "test-stub",
      usage: { inputTokens: 12, outputTokens: 3 },
    }),
  };
  return {
    ...actual,
    hasLLM: () => true,
    getLLMClient: () => blankClient,
  };
});

const emptyFields = { emails: [], phones: [], links: [], location: null };

// This suite is about blank-completion handling, not the free-tier AI gate.
// Cloud AI is now a paid feature (free cap = 0), so grant budget via the same
// DHAGA_AI_MONTHLY_CAP override a self-hoster/paid tier uses — otherwise
// assertAiBudget throws before draft/brief ever run.
beforeEach(() => {
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "1000");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("blank LLM completions surface as errors, not empty successes", () => {
  it("generateFollowUpDraft errors instead of returning an empty draft", async () => {
    const contactId = await createContact(
      { name: "Blank Draft Contact", title: null, company: null, ...emptyFields },
      "manual",
    );

    const result = await generateFollowUpDraft("user-1", contactId);

    expect(result.draft).toBeUndefined();
    expect(result.error).toBe("The draft came back empty — try again.");
  });

  it("generateBrief errors instead of returning an empty brief", async () => {
    const contactId = await createContact(
      { name: "Blank Brief Contact", title: null, company: null, ...emptyFields },
      "manual",
    );

    const result = await generateBrief("user-1", contactId);

    expect(result.brief).toBeUndefined();
    expect(result.error).toBe("The brief came back empty — try again.");
  });
});
