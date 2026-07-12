import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompleteOptions, LLMClient, LLMResult } from "@dhaga/core";

const { complete, capturedRequests } = vi.hoisted(() => {
  const requests: CompleteOptions[] = [];
  return {
    capturedRequests: requests,
    complete: vi.fn(async (request: CompleteOptions): Promise<LLMResult<string>> => {
      requests.push(request);
      return {
        data: "Great meeting you — I enjoyed hearing about the mentorship program.",
        model: "test-stub",
        usage: { inputTokens: 12, outputTokens: 10 },
      };
    }),
  };
});

vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  const client: LLMClient = {
    extract: async () => {
      throw new Error("extract() is not exercised by this test");
    },
    complete,
  };
  return {
    ...actual,
    hasLLM: () => true,
    getLLMClient: () => client,
  };
});

vi.mock("@/lib/repo/contacts", () => ({
  getContact: async () => ({
    contact: { name: "Sam Rivera", title: "Founder" },
    companyName: "Acme",
  }),
}));

vi.mock("@/lib/repo/notes", () => ({
  listFacts: async () => [
    {
      id: "fact-1",
      contactId: "contact-1",
      sourceNoteId: "note-1",
      type: "interest",
      text: "Sam runs a mentorship program for first-time founders",
      confidence: 0.98,
      createdAt: new Date("2026-07-01T00:00:00Z"),
      deletedAt: null,
      noteCreatedAt: new Date("2026-06-30T00:00:00Z"),
    },
  ],
  listNotes: async () => [],
}));

vi.mock("@/lib/repo/events", () => ({
  listContactEvents: async () => [],
}));

vi.mock("@/lib/ai/metering", () => ({
  AiBudgetError: class AiBudgetError extends Error {},
  assertAiBudget: async () => undefined,
  recordAiAction: async () => undefined,
}));

import { generateFollowUpDraft } from "@/lib/ai/draft";

describe("follow-up draft fact context", () => {
  beforeEach(() => {
    complete.mockClear();
    capturedRequests.length = 0;
  });

  it("includes a note-derived fact in the prompt sent to the LLM", async () => {
    const result = await generateFollowUpDraft("user-1", "contact-1");

    expect(result.error).toBeUndefined();
    expect(complete).toHaveBeenCalledOnce();
    expect(capturedRequests[0]?.prompt).toContain("Known facts:");
    expect(capturedRequests[0]?.prompt).toContain(
      "Sam runs a mentorship program for first-time founders",
    );
  });
});
