import { describe, expect, it } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { contactIdsForPlan } from "@/lib/repo/search-filters";
import type { NoteExtraction, SearchQueryPlan } from "@dhaga/core";

const empty = { emails: [], phones: [], links: [], location: null };

function extractionWithTags(tags: string[]): NoteExtraction {
  return { facts: [], relationships: [], follow_ups: [], tags };
}

async function seedWithTag(name: string, tag: string): Promise<string> {
  const id = await createContact({ name, title: null, company: null, ...empty }, "manual");
  const noteId = await addNote(id, "text", "note");
  await applyExtraction(id, noteId, extractionWithTags([tag]));
  return id;
}

function planFor(tags: string[]): SearchQueryPlan {
  return { session: null, company: null, tags, semantic_query: "" };
}

/**
 * M6 stage 1 filters gate what an AI search answer is even allowed to see
 * (apps/web/src/lib/ai/search.ts passes the result straight into restrictTo).
 * A false positive here isn't just noisy ranking — it lets an unrelated
 * contact's private facts into the candidate set for an answer.
 */
describe("contactIdsForPlan tag matching", () => {
  it("matches only contacts whose tags array actually contains the tag", async () => {
    const aiContact = await seedWithTag("Ada Iyer", "ai");
    const retailContact = await seedWithTag("Retra Ilse", "retail");

    const ids = await contactIdsForPlan(planFor(["ai"]));

    // "retail" contains "ai" as a literal substring ("ret-AI-l"), so a
    // naive `tags::text ILIKE '%ai%'` check — which matches against the
    // whole serialized JSON array rather than each element — would
    // wrongly pull the retail contact into an "ai" tag search.
    expect(ids?.has(aiContact)).toBe(true);
    expect(ids?.has(retailContact)).toBe(false);
  });

  it("returns undefined (no filter) when the plan has no session/company/tags", async () => {
    const ids = await contactIdsForPlan(planFor([]));
    expect(ids).toBeUndefined();
  });
});
