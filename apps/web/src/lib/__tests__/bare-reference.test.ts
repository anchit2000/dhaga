import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { createContact, listContacts } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { listContactRelationships } from "@/lib/repo/relationships";

/**
 * A relative/role reference with no proper name ("his son", "her manager") is a
 * bare reference: it names nobody, so the graph keeps it as a mentioned
 * placeholder RELABELLED off the note's subject ("Prashant's son") rather than
 * minting a phantom contact literally called "his son". A NAMED object ("Ajay")
 * is untouched. Isolated file: a fresh PGlite means "Ajay" has no colliding
 * namesake, so the named-path assertion is deterministic.
 */
function personRel(
  object: string,
  objectIsNamed: boolean | null,
  predicate = "parent_of",
): NoteExtraction {
  return {
    facts: [],
    relationships: [
      {
        subject: "contact",
        predicate,
        object,
        object_type: "person",
        object_is_named: objectIsNamed,
        entity_type_hint: null,
        role_title: null,
        is_current: null,
        started_at: null,
        ended_at: null,
      },
    ],
    follow_ups: [],
    tags: [],
  };
}

describe("bare relative/role references relabel off the note's subject", () => {
  it("turns a bare 'his son' (object_is_named:false) into 'Prashant's son', hidden from People", async () => {
    const prashant = await createContact(
      { ...emptyExtractedContact(), name: "Prashant Pandey" },
      "manual",
    );
    const note = await addNote(prashant, "text", "met his son at the office");
    await applyExtraction(prashant, note, personRel("his son", false));

    const rels = await listContactRelationships(prashant);
    expect(rels).toHaveLength(1);
    // WHY: a bare "his son" names nobody — a contact literally called "his son"
    // reads as a phantom person. Relabelling it off the owner makes the
    // placeholder legible as the owner's relative.
    expect(rels[0].name).toBe("Prashant's son");
    // WHY: it must stay a renameable "mentioned" stub, not a promoted contact.
    expect(rels[0].mentioned).toBe(true);

    // WHY: mentioned placeholders exist precisely so bare references never
    // surface as real people in the People list.
    const people = await listContacts();
    expect(people.some((p) => p.name === "Prashant's son")).toBe(false);
    expect(people.some((p) => p.name === "his son")).toBe(false);
  });

  it("leaves a NAMED object (object_is_named:true) untouched — 'Ajay' stays 'Ajay'", async () => {
    const meera = await createContact(
      { ...emptyExtractedContact(), name: "Meera Owner" },
      "manual",
    );
    const note = await addNote(meera, "text", "knows Ajay from college");
    await applyExtraction(meera, note, personRel("Ajay", true, "knows"));

    const rels = await listContactRelationships(meera);
    expect(rels).toHaveLength(1);
    // WHY: a real name is not the subject's to own — relabelling it "Meera's
    // Ajay" would be flat wrong. The named path (a fresh "Ajay" stub) is
    // exactly the pre-change behavior.
    expect(rels[0].name).toBe("Ajay");
    expect(rels[0].mentioned).toBe(true);
  });

  it("backstops a missing discriminator (object_is_named:null) with the possessive regex", async () => {
    const devi = await createContact(
      { ...emptyExtractedContact(), name: "Devi Rao" },
      "manual",
    );
    const note = await addNote(devi, "text", "escalated to her manager");
    await applyExtraction(devi, note, personRel("her manager", null, "reports_to"));

    const rels = await listContactRelationships(devi);
    expect(rels).toHaveLength(1);
    // WHY: if the model omits the flag, a leading third-person possessive must
    // still not mint a phantom "her manager" — the regex backstop relabels it
    // off the owner just as an explicit false would.
    expect(rels[0].name).toBe("Devi's manager");
    expect(rels[0].mentioned).toBe(true);
    expect((await listContacts()).some((p) => p.name === "her manager")).toBe(false);
  });
});
