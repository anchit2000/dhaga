import { eq } from "drizzle-orm";
import type { ConfirmationOption } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { SUBJECT_PRONOUNS } from "@/utils/constants/relationships";
import {
  findRelationshipCandidates,
  type RelationshipCandidate,
} from "../../../edge-suggestions";

/** The relationship's subject: a single confident contact, or an ambiguous one
 *  the user must disambiguate (a pronoun, or a name matching ≠1 contact). */
export type SubjectResolution =
  | { kind: "confident"; contactId: string }
  | { kind: "ambiguous"; candidates: RelationshipCandidate[] };

/**
 * Resolve the relationship SUBJECT. The extractor emits the literal "contact"
 * for the note's own subject — confident. A pronoun, or a name matching ≠1
 * contact, is NEVER silently collapsed onto the note's contact: it defers to a
 * subject_resolution confirmation. Only a unique exact name match links now —
 * the same gate the object side (resolvePersonObject) uses.
 */
export async function resolveSubject(
  subject: string,
  noteContactId: string,
): Promise<SubjectResolution> {
  const trimmed = subject.trim();
  if (!trimmed || trimmed.toLowerCase() === "contact") {
    return { kind: "confident", contactId: noteContactId };
  }
  if (SUBJECT_PRONOUNS.includes(trimmed.toLocaleLowerCase())) {
    return { kind: "ambiguous", candidates: [] };
  }
  const candidates = await findRelationshipCandidates(trimmed);
  const lower = trimmed.toLocaleLowerCase();
  const exact = candidates.filter((c) => c.name.toLocaleLowerCase() === lower);
  if (candidates.length === 1 && exact.length === 1) {
    return { kind: "confident", contactId: candidates[0].id };
  }
  return { kind: "ambiguous", candidates };
}

/**
 * Contacts the user can pick as the subject: the name matches when there are
 * any, otherwise the note's own contact — so a pronoun/unknown-name prompt is
 * always actionable (that contact is the most likely, but the user confirms
 * rather than us assuming it).
 */
export async function subjectOptions(
  candidates: RelationshipCandidate[],
  noteContactId: string,
): Promise<ConfirmationOption[]> {
  if (candidates.length > 0) {
    return candidates.map((c) => ({ id: c.id, label: c.name, sublabel: c.title }));
  }
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .where(eq(contacts.id, noteContactId))
    .limit(1);
  return row ? [{ id: row.id, label: row.name, sublabel: row.title }] : [];
}
