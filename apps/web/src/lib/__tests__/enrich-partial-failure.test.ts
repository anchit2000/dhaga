import { describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { listFacts, listNotes } from "@/lib/repo/notes";
import { createExtractionJob, getExtractionJob } from "@/lib/repo/extraction-jobs";
import { processExtractionJob } from "@/lib/jobs/extraction/process";
import type { LLMClient, LLMResult, NoteExtraction } from "@dhaga/core";

/**
 * Enrichment now runs as a background job (search → save note → extract). Two
 * guarantees this test pins down:
 *  1. Web-sourced facts land as *unverified* — the fix for "found 2 people,
 *     extracted nothing": we extract anyway and let the user confirm/delete.
 *  2. The findings note is saved before extraction, so a later extraction
 *     failure marks the job retryable but never loses the saved note (the
 *     original "don't report a generic failure over a real note" invariant).
 */
const state = vi.hoisted(() => ({ extractThrows: false }));

const extraction: NoteExtraction = {
  facts: [{ type: "role", text: "Co-founded a fintech startup", confidence: 0.9 }],
  relationships: [],
  follow_ups: [],
  tags: [],
};

vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  const client: LLMClient = {
    complete: async (): Promise<LLMResult<string>> => ({
      data: "Found a recent funding announcement (source.example.com).",
      model: "test-stub",
      usage: { inputTokens: 20, outputTokens: 10 },
    }),
    extract: async <T,>(): Promise<LLMResult<T>> => {
      if (state.extractThrows) throw new Error("simulated extraction outage");
      return {
        data: extraction as unknown as T,
        model: "test-stub",
        usage: { inputTokens: 5, outputTokens: 5 },
      };
    },
  };
  return { ...actual, hasLLM: () => true, getLLMClient: () => client };
});

async function seedContact(name: string): Promise<string> {
  return createContact(
    { name, title: null, company: null, emails: [], phones: [], links: [], location: null },
    "manual",
  );
}

describe("background enrichment job", () => {
  it("extracts web findings as unverified facts and completes", async () => {
    state.extractThrows = false;
    const contactId = await seedContact("Unverified Facts Contact");
    const jobId = await createExtractionJob({ contactId, kind: "enrichment" });

    await processExtractionJob(jobId, "user-1");

    const notes = await listNotes(contactId);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("enrichment");

    const facts = await listFacts(contactId);
    expect(facts).toHaveLength(1);
    // The load-bearing assertion: web-sourced facts are never silently trusted.
    expect(facts.every((f) => f.unverified)).toBe(true);

    const job = await getExtractionJob(jobId);
    expect(job?.status).toBe("done");
    expect(job?.factCount).toBe(1);
  });

  it("keeps the saved findings note and marks the job retryable when extraction fails", async () => {
    state.extractThrows = true;
    const contactId = await seedContact("Post-Save Failure Contact");
    const jobId = await createExtractionJob({ contactId, kind: "enrichment" });

    await processExtractionJob(jobId, "user-1");

    // The note is durable — saved before the (now failing) extraction ran.
    const notes = await listNotes(contactId);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("enrichment");

    // No facts, and the job is errored so the UI can offer a retry.
    expect(await listFacts(contactId)).toHaveLength(0);
    const job = await getExtractionJob(jobId);
    expect(job?.status).toBe("error");
  });
});
