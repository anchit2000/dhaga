import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  cardImages,
  confirmations,
  edges,
  embeddings,
  extractionJobs,
  facts,
  followUps,
  notes,
  signals,
} from "@/lib/db/schema";
import { getContact, mergeContacts } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { addFact, addFollowUp } from "@/lib/repo/manual-entries";
import { saveCardImage } from "@/lib/repo/card-images";
import {
  insertEdge,
  insertEmbedding,
  insertSignal,
  mergeResolution,
  uniqueContact,
} from "./support/contact-fixtures";

const firstContactId = (rows: { contactId: string | null }[]): string | null | undefined => rows[0]?.contactId;

/**
 * The merge is only correct if EVERY table referencing a contact is re-pointed
 * onto the survivor before the sources are deleted. A table missed here is the
 * forgetContact-signals bug all over again: the final delete aborts on a
 * NOT NULL FK (positions / extraction_jobs / …), or — worse for a no-FK table
 * like embeddings — a row is silently orphaned, pointing at a contact that no
 * longer exists. This seeds one of every referencing artifact and pins that
 * they all follow the survivor, and that the sources are gone.
 */
describe("mergeContacts re-points every referencing table onto the survivor", () => {
  it("moves positions/notes/facts/follow-ups/signals/cards/jobs/confirmations/embeddings, deletes the sources", async () => {
    const target = await uniqueContact("Target");
    const source = await uniqueContact("Source", { title: "Engineer", company: `Acme ${randomUUID()}` });
    const other = await uniqueContact("Other");

    const noteId = await addNote(source, "text", "met at the conference");
    const factId = await addFact(source, "personal", "likes chess");
    const followUpId = await addFollowUp(source, "email them back", null);
    const signalId = await insertSignal(source);
    const cardId = await saveCardImage(source, noteId, "image/png", "AAAA");
    const edgeId = await insertEdge(source, "knows", other);

    const db = await getDb();
    const jobId = randomUUID();
    await db.insert(extractionJobs).values({ id: jobId, contactId: source, kind: "note_extraction", status: "done" });
    const confirmationId = randomUUID();
    await db.execute(
      sql`INSERT INTO confirmations (id, type, status, payload, contact_id) VALUES (${confirmationId}, 'supplement', 'pending', ${JSON.stringify({ type: "supplement" })}::jsonb, ${source})`,
    );
    await insertEmbedding("note", noteId, source);
    await insertEmbedding("fact", factId, source);
    await insertEmbedding("contact", source, source); // the source's identity vector
    await insertEmbedding("contact", target, target); // the survivor's own identity vector

    await mergeContacts(mergeResolution(target, [source]));

    // Sources gone; survivor stays.
    expect(await getContact(source)).toBeNull();
    const survivor = await getContact(target);
    expect(survivor).not.toBeNull();

    // The source's position followed it → the denormalised title/company on the
    // survivor is recomputed from the now-merged positions.
    expect(survivor?.contact.title).toBe("Engineer");
    expect(survivor?.companyName).toContain("Acme");

    // Every FK/reference now points at the survivor.
    expect(firstContactId(await db.select({ contactId: notes.contactId }).from(notes).where(eq(notes.id, noteId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: facts.contactId }).from(facts).where(eq(facts.id, factId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: followUps.contactId }).from(followUps).where(eq(followUps.id, followUpId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: signals.contactId }).from(signals).where(eq(signals.id, signalId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: cardImages.contactId }).from(cardImages).where(eq(cardImages.id, cardId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: extractionJobs.contactId }).from(extractionJobs).where(eq(extractionJobs.id, jobId)))).toBe(target);
    expect(firstContactId(await db.select({ contactId: confirmations.contactId }).from(confirmations).where(eq(confirmations.id, confirmationId)))).toBe(target);

    const [edgeRow] = await db.select({ srcId: edges.srcId }).from(edges).where(eq(edges.id, edgeId));
    expect(edgeRow?.srcId).toBe(target);

    // Note/fact vectors follow the survivor; the source's IDENTITY vector is
    // dropped (its PK collides with the survivor's) while the survivor's stays.
    const noteVec = await db.select({ contactId: embeddings.contactId }).from(embeddings).where(and(eq(embeddings.ownerType, "note"), eq(embeddings.ownerId, noteId)));
    expect(noteVec[0]?.contactId).toBe(target);
    const factVec = await db.select({ contactId: embeddings.contactId }).from(embeddings).where(and(eq(embeddings.ownerType, "fact"), eq(embeddings.ownerId, factId)));
    expect(factVec[0]?.contactId).toBe(target);
    expect(await db.select().from(embeddings).where(and(eq(embeddings.ownerType, "contact"), eq(embeddings.ownerId, source)))).toHaveLength(0);
    expect(await db.select().from(embeddings).where(and(eq(embeddings.ownerType, "contact"), eq(embeddings.ownerId, target)))).toHaveLength(1);
  });
});

/**
 * Atomicity is the whole reason for the single transaction: a failure after
 * rows have been re-pointed but before the sources are deleted must roll ALL of
 * it back, or the graph is left half-merged. A throwaway table with an
 * uncleaned FK to a SOURCE contact forces the final source delete to fail.
 */
describe("mergeContacts is all-or-nothing", () => {
  it("rolls the whole merge back when the source delete is blocked by an FK", async () => {
    const db = await getDb();
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS _test_unhandled_merge_ref (id text PRIMARY KEY, contact_id text NOT NULL REFERENCES contacts(id))`,
    );
    try {
      const target = await uniqueContact("Target");
      const source = await uniqueContact("Source");
      const noteId = await addNote(source, "text", "should survive a failed merge");
      await db.execute(sql`INSERT INTO _test_unhandled_merge_ref (id, contact_id) VALUES (${randomUUID()}, ${source})`);

      await expect(mergeContacts(mergeResolution(target, [source]))).rejects.toThrow();

      // Nothing moved: the note still belongs to the source, and both survive.
      expect(await getContact(source)).not.toBeNull();
      expect(firstContactId(await db.select({ contactId: notes.contactId }).from(notes).where(eq(notes.id, noteId)))).toBe(source);
    } finally {
      await db.execute(sql`DROP TABLE IF EXISTS _test_unhandled_merge_ref`);
    }
  });
});

describe("mergeContacts guards against a self-merge", () => {
  it("throws rather than deleting the target when it appears in sourceIds", async () => {
    const target = await uniqueContact("Target");
    await expect(mergeContacts(mergeResolution(target, [target]))).rejects.toThrow();
    expect(await getContact(target)).not.toBeNull();
  });
});
