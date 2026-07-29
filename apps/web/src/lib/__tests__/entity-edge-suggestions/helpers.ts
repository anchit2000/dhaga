import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";

// Distinct first words per case: the resolver treats a shared-first-word match
// as ambiguous, so reusing names across tests in one in-memory DB would
// suppress the auto-linked edge (same convention as the person tests).
export function entityRel(objectName: string, hint: string | null): NoteExtraction {
  return {
    facts: [],
    relationships: [
      {
        subject: "contact",
        predicate: "trains_at",
        object: objectName,
        object_type: "entity",
        object_is_named: null,
        entity_type_hint: hint,
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

export async function makeContact(name: string): Promise<string> {
  return createContact({ ...emptyExtractedContact(), name }, "manual");
}

export async function edgeReceipt(dstId: string): Promise<string | null> {
  const db = await getDb();
  const [edge] = await db.select().from(edges).where(eq(edges.dstId, dstId));
  return edge?.sourceNoteId ?? null;
}
