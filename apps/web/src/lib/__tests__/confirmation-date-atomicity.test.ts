import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { confirmations, followUps } from "@/lib/db/schema";
import { applyExtraction } from "@/lib/repo/graph";
import { listPendingConfirmations, resolveConfirmation } from "@/lib/repo/confirmations";
import { createContact } from "@/lib/repo/contacts";
import { addNote, listOpenFollowUps } from "@/lib/repo/notes";
import type { NoteExtraction } from "@dhaga/core";

const extraction: NoteExtraction = {
  facts: [], relationships: [], tags: [],
  follow_ups: [{ action: "Weekend check-in", due_hint: "next weekend" }],
};

async function seededDateConfirmation(): Promise<{ contactId: string; confirmationId: string }> {
  const contactId = await createContact({
    name: `Atomic ${randomUUID()}`, title: null, company: null,
    emails: [], phones: [], links: [], location: null,
  }, "manual");
  const noteId = await addNote(contactId, "text", "Reach out next weekend");
  await applyExtraction(contactId, noteId, extraction, { today: { year: 2026, month: 8, day: 6 } });
  const confirmation = (await listPendingConfirmations()).find((item) => item.sourceNoteId === noteId);
  if (!confirmation) throw new Error("expected date confirmation");
  return { contactId, confirmationId: confirmation.id };
}

describe("follow-up date confirmation atomicity", () => {
  it("applies only one of simultaneous Saturday/Sunday choices", async () => {
    const seeded = await seededDateConfirmation();
    const results = await Promise.all([
      resolveConfirmation(seeded.confirmationId, { followUpDate: "2026-08-08" }),
      resolveConfirmation(seeded.confirmationId, { followUpDate: "2026-08-09" }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const [followUp] = await listOpenFollowUps(seeded.contactId);
    expect(["2026-08-08", "2026-08-09"]).toContain(followUp.dueDate?.toISOString().slice(0, 10));
  });

  it("rolls the claim back when the target follow-up is missing", async () => {
    const seeded = await seededDateConfirmation();
    const db = await getDb();
    const [row] = await db.select().from(confirmations).where(eq(confirmations.id, seeded.confirmationId));
    if (row.payload.type !== "follow_up_date") throw new Error("expected date payload");
    await db.delete(followUps).where(eq(followUps.id, row.payload.apply.followUpId));
    await expect(resolveConfirmation(seeded.confirmationId, {
      followUpDate: row.payload.scheduledDate,
    })).rejects.toThrow("target is missing");
    const [stillPending] = await db.select().from(confirmations).where(eq(confirmations.id, seeded.confirmationId));
    expect(stillPending.status).toBe("pending");
  });

  it("does not leave Saturday behind if its ambiguity cannot be recorded", async () => {
    const db = await getDb();
    // File-local PGlite only: remove confirmations created by the two tests
    // above so the temporary constraint applies to the next insert, not history.
    await db.delete(confirmations);
    await db.execute(sql`ALTER TABLE confirmations ADD CONSTRAINT _test_no_date_confirmation CHECK (type <> 'follow_up_date')`);
    try {
      const contactId = await createContact({
        name: `Rollback ${randomUUID()}`, title: null, company: null,
        emails: [], phones: [], links: [], location: null,
      }, "manual");
      const noteId = await addNote(contactId, "text", "Reach out next weekend");
      await expect(applyExtraction(contactId, noteId, extraction, {
        today: { year: 2026, month: 8, day: 6 },
      })).rejects.toThrow();
      expect(await listOpenFollowUps(contactId)).toHaveLength(0);
    } finally {
      await db.execute(sql`ALTER TABLE confirmations DROP CONSTRAINT _test_no_date_confirmation`);
    }
  });
});
