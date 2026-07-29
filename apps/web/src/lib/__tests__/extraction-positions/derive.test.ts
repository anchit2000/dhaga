import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  affiliationPredicate,
  emptyExtractedContact,
  isEducationPredicate,
} from "@dhaga/core";
import { createContact, findOrCreateCompany, getContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { fetchFullGraph } from "@/lib/repo/graph-data";
import { extractionOf, noteEdgePredicates, positionsOf, rel } from "./helpers";

/**
 * A note that states a job ("Priya just made VP of Eng at Stripe") has to land
 * on the contact's Experience, not merely as a company node — the app reads
 * employment (and the graph derives its affiliation edges) from `positions`,
 * and until now extraction wrote everything BUT a position row.
 */
describe("extraction derives positions from affiliation relationships", () => {
  it("writes the job with the note as its receipt and mirrors it into the header", async () => {
    const tag = randomUUID();
    const company = `Stripe ${tag}`;
    const id = await createContact(
      { ...emptyExtractedContact(), name: `Priya Position ${tag}` },
      "manual",
    );
    const noteId = await addNote(id, "text", "Priya just made VP of Eng at Stripe");

    await applyExtraction(
      id,
      noteId,
      extractionOf([
        rel({
          predicate: "works_at",
          object: company,
          role_title: "VP of Engineering",
          is_current: true,
          started_at: "2026",
        }),
      ]),
    );

    const rows = await positionsOf(id);
    // WHY: without source_note_id the row has no receipt, so deleting the note
    // could never tombstone it (BRD §7.4) and a re-run would duplicate it.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "VP of Engineering",
      isCurrent: true,
      startedAt: "2026",
      sourceNoteId: noteId,
      companyId: await findOrCreateCompany(company),
      // Plain employment stores NULL, exactly like the manual editor's
      // "Employment" option — affiliationPredicate() derives works_at back.
      relation: null,
    });

    // WHY: contacts.title/company_id are the denormalised primary position every
    // list, header and search reads. A job that lands in `positions` but not
    // here is invisible everywhere except the Experience list.
    const detail = await getContact(id);
    expect(detail?.contact.title).toBe("VP of Engineering");
    expect(detail?.companyName).toBe(company);
  });

  it("stores the affiliation once — as a position, not also as a literal edge", async () => {
    const tag = randomUUID();
    const employer = `Initech ${tag}`;
    const id = await createContact(
      { ...emptyExtractedContact(), name: `Single Draw ${tag}` },
      "manual",
    );
    const noteId = await addNote(id, "text", "joined Initech; also backs Vertex");

    await applyExtraction(
      id,
      noteId,
      extractionOf([
        rel({ predicate: "works_at", object: employer, is_current: true }),
        rel({ predicate: "invests_in", object: `Vertex ${tag}` }),
      ]),
    );

    // WHY: fetchFullGraph re-derives an affiliation edge from every position
    // row, so writing the literal works_at edge as well would draw the same job
    // twice. A company predicate that is NOT a role still belongs in `edges`.
    expect(await noteEdgePredicates(noteId)).toEqual(["invests_in"]);

    const employerId = await findOrCreateCompany(employer);
    const drawn = (await fetchFullGraph()).edges.filter(
      (edge) => edge.source === id && edge.target === employerId,
    );
    expect(drawn).toEqual([
      { id: `works-at:${id}`, source: id, target: employerId, predicate: "works_at", kind: "works_at" },
    ]);
  });

  it("records a school as an education position, not an Experience job", async () => {
    const tag = randomUUID();
    const id = await createContact(
      { ...emptyExtractedContact(), name: `Alum Person ${tag}` },
      "manual",
    );
    const noteId = await addNote(id, "text", "did his CS degree at MIT");

    await applyExtraction(
      id,
      noteId,
      extractionOf([
        rel({
          predicate: "studied_at",
          object: `MIT ${tag}`,
          role_title: "BSc Computer Science",
          is_current: false,
          ended_at: "2019",
        }),
      ]),
    );

    // WHY: education and employment share the positions table and are told
    // apart ONLY by `relation`. Storing NULL here would file a degree under
    // Experience and label its graph edge "worked at".
    const [row] = await positionsOf(id);
    expect(row.relation).toBe("studied_at");
    expect(isEducationPredicate(row.relation ?? "")).toBe(true);
    expect(affiliationPredicate(row)).toBe("studied_at");
    expect(row).toMatchObject({ title: "BSc Computer Science", isCurrent: false, endedAt: "2019" });
  });
});
