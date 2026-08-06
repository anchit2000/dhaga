import { describe, expect, it } from "vitest";

import { applyExtraction } from "@/lib/repo/graph";
import {
  dismissConfirmation,
  listPendingConfirmations,
  resolveConfirmation,
} from "@/lib/repo/confirmations";
import { createContact } from "@/lib/repo/contacts";
import { addNote, listOpenFollowUps } from "@/lib/repo/notes";
import { localDay } from "@/lib/repo/reminders/local-today";
import type { NoteExtraction } from "@dhaga/core";

describe("note follow-up date resolution", () => {
  it("uses the owner's day, schedules Saturday, and can move to Sunday", async () => {
    const contactId = await createContact(
      { name: "Date Test", title: null, company: null, emails: [], phones: [], links: [], location: null },
      "manual",
    );
    const noteId = await addNote(
      contactId,
      "text",
      "Reach out next weekend, send a deck in 10 days, and call by Saturday",
    );
    const extraction: NoteExtraction = {
      facts: [],
      relationships: [],
      tags: [],
      follow_ups: [
        { action: "Reach out", due_hint: "next weekend" },
        { action: "Send deck", due_hint: "10 days from now" },
        { action: "Call", due_hint: "by Saturday" },
      ],
    };
    const ownerDay = localDay(new Date("2026-08-07T02:00:00Z"), "America/Los_Angeles");

    await applyExtraction(contactId, noteId, extraction, { today: ownerDay });

    const followUps = await listOpenFollowUps(contactId);
    expect(followUps.find((item) => item.action === "Reach out")?.dueDate?.toISOString()).toBe(
      "2026-08-08T00:00:00.000Z",
    );
    expect(followUps.find((item) => item.action === "Send deck")?.dueDate?.toISOString()).toBe(
      "2026-08-16T00:00:00.000Z",
    );
    expect(followUps.find((item) => item.action === "Call")?.dueDate?.toISOString()).toBe(
      "2026-08-08T00:00:00.000Z",
    );

    const [confirmation] = await listPendingConfirmations();
    expect(confirmation.payload.type).toBe("follow_up_date");
    if (confirmation.payload.type !== "follow_up_date") return;
    expect(confirmation.payload.scheduledDate).toBe("2026-08-08");
    expect(confirmation.payload.alternativeDate).toBe("2026-08-09");

    await resolveConfirmation(confirmation.id, { followUpDate: "2026-08-09" });
    const moved = await listOpenFollowUps(contactId);
    expect(moved.find((item) => item.action === "Reach out")?.dueDate?.toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
  });

  it("keeps the scheduled Saturday when its date question is dismissed", async () => {
    const contactId = await createContact(
      { name: "Dismiss Date", title: null, company: null, emails: [], phones: [], links: [], location: null },
      "manual",
    );
    const noteId = await addNote(contactId, "text", "Reach out next weekend");
    const extraction: NoteExtraction = {
      facts: [], relationships: [], tags: [],
      follow_ups: [{ action: "Reach out", due_hint: "next weekend" }],
    };
    await applyExtraction(contactId, noteId, extraction, {
      today: { year: 2026, month: 8, day: 6 },
    });
    const confirmation = (await listPendingConfirmations()).find(
      (item) => item.sourceNoteId === noteId,
    );
    expect(confirmation).toBeDefined();
    await dismissConfirmation(confirmation?.id ?? "");

    const [followUp] = await listOpenFollowUps(contactId);
    expect(followUp.dueDate?.toISOString()).toBe("2026-08-08T00:00:00.000Z");
  });
});
