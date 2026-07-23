import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import type { LLMClient, LLMResult, NoteExtraction } from "@dhaga/core";

const extraction: NoteExtraction = {
  facts: [{ type: "role", text: "Runs the platform team", confidence: 0.9 }],
  relationships: [],
  follow_ups: [],
  tags: [],
};

/**
 * The LLM call and the graph write are separate failure domains. If the AI
 * call succeeds but the follow-on write to facts/edges/follow_ups fails
 * (e.g. the contact was deleted out from under an in-flight extraction —
 * forgetContact cascades for real), the user must be told the graph write
 * failed, not "the AI call failed" — that would send anyone debugging a
 * real outage looking at the wrong layer (LLM provider vs. the DB).
 */
vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  const client: LLMClient = {
    extract: async <T,>(): Promise<LLMResult<T>> => ({
      data: extraction as unknown as T,
      model: "test-stub",
      usage: { inputTokens: 5, outputTokens: 5 },
    }),
    complete: async () => {
      throw new Error("complete() is not exercised by this test");
    },
  };
  return { ...actual, hasLLM: () => true, getLLMClient: () => client };
});

// This test is about failure attribution (graph write vs. AI call), not the
// free-tier gate. Cloud AI is now paid (free cap = 0), so grant budget via
// DHAGA_AI_MONTHLY_CAP or assertAiBudget throws before extraction runs.
beforeEach(() => {
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "1000");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("note extraction attributes graph-write failures correctly", () => {
  it("reports a graph-save failure, not an AI-call failure, when the write throws", async () => {
    const contactId = await createContact(
      { name: "Real Contact", title: null, company: null, emails: [], phones: [], links: [], location: null },
      "manual",
    );
    const noteId = await addNote(contactId, "text", "met at a conference");

    // Simulates the contact having vanished between note-save and extraction
    // running (e.g. concurrent forgetContact) — facts.contact_id has a real
    // NOT NULL FK to contacts(id), so this insert genuinely throws.
    const vanishedContactId = randomUUID();

    const outcome = await extractAndApplyNote(
      "user-1",
      vanishedContactId,
      noteId,
      "Someone",
      "met at a conference",
    );

    expect(outcome.applied).toBe(false);
    expect(outcome.notice).toContain("saving them to the graph failed");
    expect(outcome.notice).not.toContain("The AI call failed");
  });
});
