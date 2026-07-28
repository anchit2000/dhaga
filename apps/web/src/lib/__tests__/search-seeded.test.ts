import { beforeAll, describe, expect, it } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { hybridSearch } from "@/lib/repo/search";
import { retrieveHits } from "@/lib/ai/search/answer/helpers";
import type { NoteExtraction, SearchQueryPlan } from "@dhaga/core";

const empty = { emails: [], phones: [], links: [], location: null };

function extractionWith(facts: string[], tags: string[]): NoteExtraction {
  return {
    facts: facts.map((text) => ({ type: "role" as const, text, confidence: 0.9 })),
    relationships: [],
    follow_ups: [],
    tags,
  };
}

async function seed(
  name: string,
  title: string | null,
  company: string | null,
  note: string,
  facts: string[],
  tags: string[],
): Promise<string> {
  const id = await createContact({ name, title, company, ...empty }, "manual");
  const noteId = await addNote(id, "text", note);
  await applyExtraction(id, noteId, extractionWith(facts, tags));
  return id;
}

let rohan: string;
let sarah: string;
let priya: string;

/**
 * M6 acceptance: seeded test set — the correct contact ranks in the top 3.
 * Runs the keyword half of hybrid retrieval (embeddings are off in tests so
 * CI never downloads the model); semantic ranking is covered by the
 * standalone E2E check documented in docs/TESTING.md §7.
 */
describe("hybrid search over a seeded graph (M6 acceptance)", () => {
  beforeAll(async () => {
    rohan = await seed(
      "Rohan Mehta", "Head of Ops", "Freightline",
      "Runs ops for a freight forwarder. They're evaluating route-optimisation AI next quarter and have budget approved.",
      ["Evaluating route-optimisation AI with approved budget"],
      ["logistics"],
    );
    sarah = await seed(
      "Sarah Chen", "VP Payments", "Stripe",
      "Leads payments partnerships, interested in emerging-market rails.",
      ["Leads payments partnerships"],
      ["fintech"],
    );
    priya = await seed(
      "Priya Nair", "CTO", "Aerolane",
      "Hiring ML engineers for the Singapore office this year.",
      ["Hiring ML engineers in Singapore"],
      ["hiring"],
    );
    await seed("Dan Wu", "Designer", "Studio North", "Talked about typography.", [], ["design"]);
    await seed("Alice Wong", "Counsel", "Lex LLP", "Handles cross-border contracts.", [], ["legal"]);
  });

  const expectTop3 = (hits: { contactId: string }[], id: string) => {
    expect(hits.slice(0, 3).map((hit) => hit.contactId)).toContain(id);
  };

  it("finds the logistics contact for an AI-budget question", async () => {
    expectTop3(await hybridSearch("freight AI budget"), rohan);
  });

  it("finds the fintech contact by sector words", async () => {
    expectTop3(await hybridSearch("payments fintech"), sarah);
  });

  it("finds the hiring contact by note content", async () => {
    expectTop3(await hybridSearch("hiring Singapore engineers"), priya);
  });

  it("returns match receipts explaining why a contact surfaced", async () => {
    const [top] = await hybridSearch("route-optimisation");
    expect(top.contactId).toBe(rohan);
    expect(top.matches.length).toBeGreaterThan(0);
  });

  it("returns nothing for words absent from the graph", async () => {
    expect(await hybridSearch("quantum blockchain sommelier")).toHaveLength(0);
  });

  /**
   * restrictTo comes from a structured filter (event/company/tags) that
   * already establishes the match — e.g. "who did I meet at the AI summit"
   * is answered by attendance, not by wording overlap with the note text.
   * If hybridSearch only ever surfaced contacts it could *also* score by
   * keyword/semantic overlap, a structurally-matched contact with unrelated
   * note content would be silently dropped from every AI answer.
   */
  it("keeps a structurally-filtered contact even with zero keyword/semantic score", async () => {
    const filtered = await seed(
      "Zara Ito", "Engineer", "Globex",
      "Talked about weekend hiking trips.",
      [],
      ["ops"],
    );

    const hits = await hybridSearch(
      "quantum blockchain sommelier",
      new Set([filtered]),
    );

    expect(hits.map((hit) => hit.contactId)).toContain(filtered);
  });

  /**
   * Regression — the Ask-Dhaga "Who do I know in MIT" miss. A lossy query plan
   * whose tag filter matches an *unrelated* contact must not bury the real
   * literal-text match. Here the plan mis-reads the question as tag `education`
   * (matching the decoy), while the genuine contact carries "MIT" only in a
   * note. The old retrieval hard-restricted to the tag match and, because that
   * result was non-empty, never ran its unfiltered fallback — so it answered
   * with the wrong contact and dropped the real one. retrieveHits must now
   * search the literal question graph-wide and rank the note match above the
   * mis-filtered decoy.
   */
  it("does not let a wrong tag filter bury the real literal-text match", async () => {
    const mitProf = await seed(
      "Nadia Prakash", "Professor", "IIT Bombay",
      "Earned a doctoral degree from MIT and now runs a photonics lab.",
      [],
      ["research"],
    );
    const eduDecoy = await seed(
      "Owen Carter", "Engineer", "Acme",
      "Builds internal tooling, no academic ties.",
      [],
      ["education"],
    );

    const lossyPlan: SearchQueryPlan = {
      event: null,
      company: null,
      tags: ["mit", "education"],
      semantic_query: "MIT university alumni",
    };
    const ids = (await retrieveHits(lossyPlan, "Who do I know in MIT")).map((hit) => hit.id);

    // The real note match surfaces at all (the old gate dropped it entirely)…
    expect(ids).toContain(mitProf);
    // …and outranks the mis-filtered, textually-irrelevant decoy (which the old
    // path returned as the sole answer).
    expect(ids.indexOf(mitProf)).toBeLessThan(ids.indexOf(eduDecoy));
  });
});
