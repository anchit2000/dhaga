import { describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { listNotes } from "@/lib/repo/notes";
import { enrichContact } from "@/lib/ai/enrich";
import type { LLMClient, LLMResult } from "@dhaga/core";

/**
 * enrichContact saves the web-search findings as a note *before* indexing
 * and extracting facts from it. If a later step (embedding indexing, or
 * fact extraction) throws, the note is still sitting in the contact's
 * timeline — the user must be told their findings were saved, never the
 * generic "Enrichment failed", which reads as a total no-op and would send
 * them clicking the enrich button again believing nothing happened.
 */
vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  const client: LLMClient = {
    extract: async () => {
      throw new Error("extract() is not exercised by this test");
    },
    complete: async (): Promise<LLMResult<string>> => ({
      data: "Found a recent funding announcement (source.example.com).",
      model: "test-stub",
      usage: { inputTokens: 20, outputTokens: 10 },
    }),
  };
  return { ...actual, hasLLM: () => true, getLLMClient: () => client };
});

vi.mock("@/lib/repo/embeddings", () => ({
  upsertEmbedding: async () => {
    throw new Error("simulated indexing outage");
  },
}));

describe("enrichContact does not lose a saved note behind a generic failure", () => {
  it("reports success with the note intact when indexing/extraction fails after the note is saved", async () => {
    const contactId = await createContact(
      {
        name: "Post-Save Failure Contact",
        title: null,
        company: null,
        emails: [],
        phones: [],
        links: [],
        location: null,
      },
      "manual",
    );

    const result = await enrichContact("user-1", contactId);

    // The bug: this used to come back as { error: "Enrichment failed." },
    // indistinguishable from nothing having happened, even though...
    expect(result.error).toBeUndefined();
    expect(result.noticed).toContain("saved as a note");

    // ...the note really is there.
    const notes = await listNotes(contactId);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("enrichment");
  });
});
