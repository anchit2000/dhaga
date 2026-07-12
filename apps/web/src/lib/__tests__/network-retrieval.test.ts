import { describe, expect, it } from "vitest";
import {
  createContact,
  findContactIdentityCandidates,
  getContact,
  mergeMentionedContact,
  promoteMentionedContact,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { listContactConnectionsPage } from "@/lib/repo/connections";
import { recommendContactsPage } from "@/lib/repo/recommendations";

const input = (name: string, company: string | null, title: string | null = null) => ({
  name,
  title,
  company,
  emails: [],
  phones: [],
  links: [],
  location: null,
});

describe("bounded network retrieval", () => {
  it("asks for identity resolution when a global note matches several contacts", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const ids = await Promise.all([
      createContact(input(`Aditi Alpha${suffix}`, "Northwind", "Founder"), "manual"),
      createContact(input(`Aditi Beta${suffix}`, "Contoso", "Investor"), "manual"),
      createContact(input(`Aditi Gamma${suffix}`, "Fabrikam", "Operator"), "manual"),
    ]);
    const candidates = await findContactIdentityCandidates("Aditi has a son named Aaryan");
    expect(ids.every((id) => candidates.some((candidate) => candidate.id === id))).toBe(true);
  });

  it("paginates a large company without repeating contacts", async () => {
    const company = `Scale Co ${crypto.randomUUID()}`;
    const root = await createContact(input("Scale Root", company), "manual");
    for (let index = 0; index < 12; index += 1) {
      await createContact(input(`Scale Person ${String(index).padStart(2, "0")}`, company), "manual");
    }

    const first = await listContactConnectionsPage(root, { limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    expect(first.facets).toContainEqual(
      expect.objectContaining({ source: "company", value: "same_company", count: 12 }),
    );

    const second = await listContactConnectionsPage(root, {
      limit: 5,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.items).toHaveLength(5);
    expect(second.items.some((item) => first.items.some((seen) => seen.contactId === item.contactId))).toBe(false);
  });

  it("keeps an arbitrary relationship as a filterable edge to a hidden mention", async () => {
    const root = await createContact(input(`Interview Root ${crypto.randomUUID()}`, null), "manual");
    const mentionedName = `Aaryan ${crypto.randomUUID()}`;
    const noteId = await addNote(root, "voice", `Attended an interview with ${mentionedName}`);
    await applyExtraction(root, noteId, {
      facts: [],
      relationships: [
        {
          subject: "contact",
          predicate: "attended_interview_with",
          object: mentionedName,
          object_type: "person",
        },
      ],
      follow_ups: [],
      tags: [],
    });

    const page = await listContactConnectionsPage(root, {
      filter: { facets: { relationship: ["attended_interview_with"] } },
    });
    expect(page.items).toContainEqual(
      expect.objectContaining({ name: mentionedName, mentioned: true }),
    );
    expect(page.facets).toContainEqual(
      expect.objectContaining({ value: "attended_interview_with" }),
    );
  });

  it("promotes or merges hidden mentions without losing their edges", async () => {
    const root = await createContact(input(`Merge Root ${crypto.randomUUID()}`, null), "manual");
    const mentionName = `Mention ${crypto.randomUUID()}`;
    const noteId = await addNote(root, "voice", mentionName);
    await applyExtraction(root, noteId, {
      facts: [],
      relationships: [{ subject: "contact", predicate: "parent_of", object: mentionName, object_type: "person" }],
      follow_ups: [],
      tags: [],
    });
    const [mention] = (await listContactConnectionsPage(root)).items.filter(
      (item) => item.name === mentionName,
    );
    expect(await promoteMentionedContact(mention.contactId)).toBe(true);
    expect((await getContact(mention.contactId))?.contact.source).toBe("manual");

    const secondMentionName = `Second Mention ${crypto.randomUUID()}`;
    const secondNoteId = await addNote(root, "voice", secondMentionName);
    await applyExtraction(root, secondNoteId, {
      facts: [],
      relationships: [{ subject: "contact", predicate: "worked_with", object: secondMentionName, object_type: "person" }],
      follow_ups: [],
      tags: [],
    });
    const secondMention = (await listContactConnectionsPage(root)).items.find(
      (item) => item.name === secondMentionName,
    );
    const target = await createContact(input(`Existing Person ${crypto.randomUUID()}`, null), "manual");
    expect(await mergeMentionedContact(secondMention?.contactId ?? "", target)).toBe(true);
    expect(await getContact(secondMention?.contactId ?? "")).toBeNull();
    expect((await listContactConnectionsPage(root)).items.some((item) => item.contactId === target)).toBe(true);
  });

  it("requires useful context instead of recommending a title alone", async () => {
    const marker = `fintech-${crypto.randomUUID()}`;
    const root = await createContact(input(`Context Root ${crypto.randomUUID()}`, null), "manual");
    const useful = await createContact(input(`Useful CEO ${crypto.randomUUID()}`, null, "CEO"), "manual");
    await createContact(input(`Unrelated CEO ${crypto.randomUUID()}`, null, "CEO"), "manual");

    const rootNote = await addNote(root, "text", marker);
    await applyExtraction(root, rootNote, { facts: [], relationships: [], follow_ups: [], tags: [marker] });
    const usefulNote = await addNote(useful, "text", marker);
    await applyExtraction(useful, usefulNote, { facts: [], relationships: [], follow_ups: [], tags: [marker] });

    const page = await recommendContactsPage(root, { intent: "founder", context: marker });
    expect(page.items.map((item) => item.contactId)).toContain(useful);
    expect(page.items.every((item) => item.reasons.some((reason) => reason.startsWith("Matches")))).toBe(true);
  });
});
