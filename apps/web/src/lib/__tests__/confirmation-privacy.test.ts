import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { confirmations, followUps, notes } from "@/lib/db/schema";
import { applyExtraction } from "@/lib/repo/graph";
import { listPendingConfirmations, resolveConfirmation } from "@/lib/repo/confirmations";
import { createContact, forgetContact } from "@/lib/repo/contacts";
import { createEntity, deleteEntity } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { addNote, clearNoteDerivations, deleteNote } from "@/lib/repo/notes";
import type { NoteExtraction } from "@dhaga/core";

const extraction: NoteExtraction = {
  facts: [], relationships: [], tags: [],
  follow_ups: [{ action: "Private weekend", due_hint: "next weekend" }],
};

async function resolvedForNote(contactId: string, noteId: string): Promise<string> {
  await applyExtraction(contactId, noteId, extraction, { today: { year: 2026, month: 8, day: 6 } });
  const item = (await listPendingConfirmations()).find((row) => row.sourceNoteId === noteId);
  if (!item || item.payload.type !== "follow_up_date") throw new Error("expected date confirmation");
  await resolveConfirmation(item.id, { followUpDate: item.payload.alternativeDate });
  return item.id;
}

async function expectConfirmationGone(id: string): Promise<void> {
  const db = await getDb();
  expect(await db.select().from(confirmations).where(eq(confirmations.id, id))).toHaveLength(0);
}

async function expectFollowUpsGone(noteId: string): Promise<void> {
  const db = await getDb();
  expect(await db.select().from(followUps).where(eq(followUps.sourceNoteId, noteId))).toHaveLength(0);
}

describe("resolved confirmation privacy cascades", () => {
  it("removes resolved date choices when a note is deleted or reprocessed", async () => {
    const contactId = await createContact({
      name: `Note privacy ${randomUUID()}`, title: null, company: null,
      emails: [], phones: [], links: [], location: null,
    }, "manual");
    const first = await addNote(contactId, "text", "Reach out next weekend");
    const firstConfirmation = await resolvedForNote(contactId, first);
    await deleteNote(first);
    await expectConfirmationGone(firstConfirmation);
    await expectFollowUpsGone(first);
    const second = await addNote(contactId, "text", "Reach out next weekend");
    const secondConfirmation = await resolvedForNote(contactId, second);
    await clearNoteDerivations(second);
    await expectConfirmationGone(secondConfirmation);
    await expectFollowUpsGone(second);
  });

  it("removes confirmations by receipt or contact before forgetting a person", async () => {
    const contactId = await createContact({
      name: `Contact privacy ${randomUUID()}`, title: null, company: null,
      emails: [], phones: [], links: [], location: null,
    }, "manual");
    const noteId = await addNote(contactId, "text", "Reach out next weekend");
    const id = await resolvedForNote(contactId, noteId);
    const db = await getDb();
    // Remove the receipt link so this row can only be found by contact_id.
    await db.update(confirmations).set({ sourceNoteId: null }).where(eq(confirmations.id, id));
    await forgetContact(contactId);
    await expectConfirmationGone(id);
  });

  it("removes confirmations whose receipt is an entity note", async () => {
    const db = await getDb();
    const typeId = await createNodeType({ name: `Privacy ${randomUUID()}`, color: "#a78bfa" });
    const entityId = await createEntity({ typeId, name: "Private entity" });
    const contactId = await createContact({
      name: `Entity privacy ${randomUUID()}`, title: null, company: null,
      emails: [], phones: [], links: [], location: null,
    }, "manual");
    const noteId = randomUUID();
    await db.insert(notes).values({ id: noteId, entityId, kind: "text", body: "Reach out next weekend" });
    const id = await resolvedForNote(contactId, noteId);
    await deleteEntity(entityId);
    await expectConfirmationGone(id);
  });
});
