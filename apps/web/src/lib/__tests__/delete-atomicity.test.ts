import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { embeddings } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { addNote, deleteFact, deleteNote, listFacts, listNotes } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import * as embeddingsRepo from "@/lib/repo/embeddings";
import { semanticSearch } from "@/lib/repo/embeddings";
import type { NoteExtraction } from "@dhaga/core";

// embedQuery/embedPassages hit a local ML model and are disabled in tests
// (vitest.config.ts sets DHAGA_EMBEDDINGS=off) — semanticSearch bails out to
// `[]` before ever touching the DB unless embedQuery returns a vector. Stub
// it to a fixed unit vector so seeded embedding rows (below) are genuinely
// retrievable through the real cosineDistance query, not just present in
// the table.
const { QUERY_VECTOR } = vi.hoisted(() => ({
  QUERY_VECTOR: Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0)),
}));

vi.mock("@/lib/ai/embedder", () => ({
  embedQuery: vi.fn().mockResolvedValue(QUERY_VECTOR),
  embedPassages: vi.fn().mockResolvedValue(null),
}));

const contactInput = {
  name: "Delete Atomicity Person",
  title: "Ops",
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

const extraction: NoteExtraction = {
  facts: [{ type: "role", text: "Runs the warehouse floor", confidence: 0.9 }],
  relationships: [],
  follow_ups: [],
  tags: [],
};

/** Seed an embedding row directly with the same vector embedQuery is stubbed
 *  to return, so it's a guaranteed similarity-1.0 hit for any query. */
async function seedEmbedding(
  ownerType: "note" | "fact",
  ownerId: string,
  contactId: string,
  content: string,
): Promise<void> {
  const db = await getDb();
  await db.insert(embeddings).values({ ownerType, ownerId, contactId, content, embedding: QUERY_VECTOR });
}

/**
 * The receipts invariant (BRD §7.4 / CLAUDE.md "every AI-derived fact keeps
 * a receipt") depends on deleteNote/deleteFact being all-or-nothing. Before
 * this fix, each was a bare sequence of independent statements: a failure
 * partway through (a transient DB error, a concurrent write on the same
 * rows) could leave the note/facts/edges tombstoned — invisible in
 * listNotes/listFacts — while their embeddings survived untouched, because
 * semanticSearch queries the embeddings table directly with zero join back
 * to notes/facts and zero deletedAt filtering. That meant content the user
 * explicitly deleted, believing it gone, could keep surfacing verbatim
 * through natural-language search indefinitely.
 */
describe("deleteNote is all-or-nothing", () => {
  it("rolls back the note/fact tombstones when the embedding cleanup step fails, instead of leaving a searchable orphan", async () => {
    const id = await createContact({ ...contactInput, name: "Rollback Note Person" }, "manual");
    const noteId = await addNote(id, "text", "warehouse note that must survive a failed delete");
    await applyExtraction(id, noteId, extraction);
    await seedEmbedding("note", noteId, id, "warehouse note that must survive a failed delete");

    const deleteEmbeddingsSpy = vi
      .spyOn(embeddingsRepo, "deleteEmbeddingsForNote")
      .mockRejectedValueOnce(new Error("simulated transient DB error"));

    await expect(deleteNote(noteId)).rejects.toThrow("simulated transient DB error");
    expect(deleteEmbeddingsSpy).toHaveBeenCalled();
    deleteEmbeddingsSpy.mockRestore();

    // Nothing was tombstoned — the notes/facts updates ran inside the same
    // transaction as the failed embedding cleanup, so they rolled back too,
    // rather than landing as a partial, already-committed tombstone.
    expect((await listNotes(id)).some((note) => note.id === noteId)).toBe(true);
    expect(await listFacts(id)).not.toHaveLength(0);

    // And the content is still genuinely retrievable via real semantic
    // search — proving this isn't a silent half-state where the tombstone
    // "mostly" didn't happen but search access was quietly severed anyway.
    const hits = await semanticSearch("warehouse note that must survive a failed delete", 50);
    expect(hits.some((hit) => hit.contactId === id)).toBe(true);
  });

  it("tombstones note/facts and removes their embeddings so semantic search stops surfacing them (the actual leak this closes)", async () => {
    const id = await createContact({ ...contactInput, name: "Happy Delete Person" }, "manual");
    const noteId = await addNote(id, "text", "a note about a searchable shipment delay");
    await applyExtraction(id, noteId, extraction);
    await seedEmbedding("note", noteId, id, "a note about a searchable shipment delay");

    const before = await semanticSearch("a note about a searchable shipment delay", 50);
    expect(before.some((hit) => hit.contactId === id)).toBe(true);

    await deleteNote(noteId);

    expect((await listNotes(id)).some((note) => note.id === noteId)).toBe(false);
    expect(await listFacts(id)).toHaveLength(0);

    const after = await semanticSearch("a note about a searchable shipment delay", 50);
    expect(after.some((hit) => hit.contactId === id)).toBe(false);
  });
});

describe("deleteFact is all-or-nothing", () => {
  it("rolls back the fact tombstone when embedding cleanup fails, instead of stranding an orphaned embedding", async () => {
    const id = await createContact({ ...contactInput, name: "Rollback Fact Person" }, "manual");
    const noteId = await addNote(id, "text", "note with one fact to roll back");
    await applyExtraction(id, noteId, extraction);
    const [fact] = await listFacts(id);
    await seedEmbedding("fact", fact.id, id, fact.text);

    const deleteEmbeddingSpy = vi
      .spyOn(embeddingsRepo, "deleteEmbedding")
      .mockRejectedValueOnce(new Error("simulated transient DB error"));

    await expect(deleteFact(fact.id)).rejects.toThrow("simulated transient DB error");
    expect(deleteEmbeddingSpy).toHaveBeenCalled();
    deleteEmbeddingSpy.mockRestore();

    // The fact update must not have committed on its own — otherwise the
    // fact is gone from listFacts everywhere else, yet its embedding (never
    // reached) stays fully searchable forever.
    const stillThere = await listFacts(id);
    expect(stillThere.some((row) => row.id === fact.id)).toBe(true);
  });

  it("tombstones the fact and removes its embedding", async () => {
    const id = await createContact({ ...contactInput, name: "Happy Fact Person" }, "manual");
    const noteId = await addNote(id, "text", "note with a fact to delete cleanly");
    await applyExtraction(id, noteId, extraction);
    const [fact] = await listFacts(id);
    await seedEmbedding("fact", fact.id, id, fact.text);

    await deleteFact(fact.id);

    expect((await listFacts(id)).some((row) => row.id === fact.id)).toBe(false);
    const after = await semanticSearch(fact.text, 50);
    expect(after.some((hit) => hit.contactId === id && hit.ownerType === "fact")).toBe(false);
  });
});
