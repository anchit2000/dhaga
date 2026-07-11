import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { edges, facts, followUps } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { addNote, listFacts, listOpenFollowUps } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import type { NoteExtraction } from "@dhaga/core";

const contactInput = {
  name: "Priya Nair",
  title: "VP Partnerships",
  company: "Northbridge",
  emails: [],
  phones: [],
  links: [],
  location: null,
};

function buildExtraction(): NoteExtraction {
  return {
    facts: [
      { type: "role", text: "Leads partnerships for the region", confidence: 0.9 },
      { type: "intent", text: "Exploring a co-marketing deal", confidence: 0.8 },
      { type: "personal", text: "Just returned from parental leave", confidence: 0.6 },
    ],
    relationships: [
      { subject: "contact", predicate: "works_at", object: "Northbridge", object_type: "company" },
    ],
    follow_ups: [
      { action: "Send partnership deck", due_hint: "this week" },
      { action: "Loop in legal", due_hint: null },
    ],
    tags: [],
  };
}

/**
 * applyExtraction writes one note's facts/edges/follow-ups without wrapping
 * the whole function in a DB transaction — a transaction would hold a
 * connection open across upsertEmbedding()/emitWebhook()'s network calls,
 * a real risk under Supabase's 5-connection pool cap (apps/web/src/lib/db/index.ts).
 *
 * Instead each entity type must land as ONE multi-row insert, so a single
 * Postgres statement's own atomicity protects it. Before this fix, the code
 * looped and called db.insert() once per fact/edge/follow-up: a failure
 * partway through (transient DB error, connection blip, or the contact
 * vanishing mid-extraction — facts.contact_id has a real NOT NULL FK to
 * contacts(id), so a concurrent delete makes the insert genuinely throw)
 * left whatever had already been inserted permanently committed while
 * everything after silently never happened — yet the caller reports this
 * uniformly as "saving to the graph failed", which reads as "nothing was
 * saved" even though partial data now secretly exists.
 */
describe("applyExtraction writes each entity type as one atomic batch", () => {
  it("issues exactly one insert call per table, not one per item", async () => {
    const contactId = await createContact(contactInput, "manual");
    const noteId = await addNote(contactId, "text", "quarterly check-in");
    const db = await getDb();

    const insertSpy = vi.spyOn(db, "insert");
    await applyExtraction(contactId, noteId, buildExtraction());

    // The extraction has 3 facts, 1 relationship (resolves to an edge), and
    // 2 follow-ups. A per-item loop would call db.insert() 3 times for
    // facts and 2 times for follow-ups; batching means exactly one call
    // each, carrying every row for that table at once.
    const factsCalls = insertSpy.mock.calls.filter(([table]) => table === facts);
    const edgeCalls = insertSpy.mock.calls.filter(([table]) => table === edges);
    const followUpCalls = insertSpy.mock.calls.filter(([table]) => table === followUps);
    insertSpy.mockRestore();

    expect(factsCalls).toHaveLength(1);
    expect(edgeCalls).toHaveLength(1);
    expect(followUpCalls).toHaveLength(1);

    expect(await listFacts(contactId)).toHaveLength(3);
    expect(await listOpenFollowUps(contactId)).toHaveLength(2);
  });

  it("a failed facts write leaves zero facts behind, never a silently-partial subset", async () => {
    const contactId = await createContact({ ...contactInput, name: "Second VP" }, "manual");
    const noteId = await addNote(contactId, "text", "another check-in");
    const db = await getDb();

    // Simulates a transient DB error hitting the facts write. With the old
    // per-row loop, this class of failure could strike after some facts had
    // already been inserted, leaving them stranded. Because facts are now
    // written as a single statement, either all of them land or, as here,
    // none do — there is no in-between state to leak.
    const insertSpy = vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("simulated transient DB error");
    });

    await expect(applyExtraction(contactId, noteId, buildExtraction())).rejects.toThrow(
      "simulated transient DB error",
    );
    insertSpy.mockRestore();

    expect(await listFacts(contactId)).toHaveLength(0);
  });
});
