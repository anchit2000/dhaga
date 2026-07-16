import { randomUUID } from "node:crypto";
import { ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { escapeLike } from "@/utils/escape-like";

export interface RelationshipCandidate {
  id: string;
  name: string;
  title: string | null;
}

export type PersonResolution =
  | { kind: "edge"; dstId: string }
  | { kind: "suggestion"; candidateIds: string[] };

/**
 * Contacts whose name could be the person a note referred to — an exact
 * (case-insensitive) match, or anyone sharing the first name. Used to decide
 * whether a new relationship can be linked automatically or needs confirming.
 */
export async function findRelationshipCandidates(
  objectName: string,
): Promise<RelationshipCandidate[]> {
  const trimmed = objectName.trim();
  if (!trimmed) return [];
  const db = await getDb();
  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  const rows = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .where(or(ilike(contacts.name, escapeLike(trimmed)), ilike(contacts.name, `${escapeLike(firstWord)}%`)))
    .limit(8);
  const lower = trimmed.toLocaleLowerCase();
  return rows.sort((a, b) => {
    const aExact = a.name.toLocaleLowerCase() === lower ? 0 : 1;
    const bExact = b.name.toLocaleLowerCase() === lower ? 0 : 1;
    return aExact - bExact || a.name.localeCompare(b.name);
  });
}

export async function createMentionedContact(name: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(contacts).values({
    id,
    name: name.trim(),
    title: null,
    companyId: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
    tags: [],
    source: "mentioned",
  });
  return id;
}

/**
 * How to handle a person object in an extracted relationship: link it now when
 * there's no ambiguity (nobody by that name yet → create a mentioned contact;
 * or exactly one exact match → use it), otherwise defer to a confirmation so
 * the user picks which "Ajay" is meant.
 */
export async function resolvePersonObject(objectName: string): Promise<PersonResolution> {
  const candidates = await findRelationshipCandidates(objectName);
  if (candidates.length === 0) {
    return { kind: "edge", dstId: await createMentionedContact(objectName) };
  }
  const lower = objectName.trim().toLocaleLowerCase();
  const exact = candidates.filter((c) => c.name.toLocaleLowerCase() === lower);
  if (candidates.length === 1 && exact.length === 1) {
    return { kind: "edge", dstId: candidates[0].id };
  }
  return { kind: "suggestion", candidateIds: candidates.map((c) => c.id) };
}
