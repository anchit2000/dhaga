import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { PERSON_KIND_BY } from "@/utils/constants/person-kind";
import type { PersonKind } from "@dhaga/core";

/**
 * A USER's ruling on whether a contact is a person or a service — the appeal
 * route for the nightly classifier's guess.
 *
 * `person_kind_by = 'user'` is the whole point: it is a LOCK the sweep honours,
 * so a correction is never re-judged and never silently reverted the next
 * night. Confidence is cleared because a user decision has no model certainty
 * to order a review list by (see lib/db/schema/contacts.ts), and
 * `person_classified_at` is stamped so the row reads as judged, not pending.
 *
 * `updatedAt` is deliberately NOT bumped (same as `setStarred`): the contact's
 * own data did not change, and the timestamp drives outward address-book sync.
 */
function userRuling(kind: PersonKind): {
  personKind: PersonKind;
  personKindBy: string;
  personKindConfidence: null;
  personClassifiedAt: Date;
} {
  return {
    personKind: kind,
    personKindBy: PERSON_KIND_BY[1],
    personKindConfidence: null,
    personClassifiedAt: new Date(),
  };
}

/** Record the user's person/service ruling for one contact. */
export async function setPersonKind(contactId: string, kind: PersonKind): Promise<void> {
  const db = await getDb();
  await db.update(contacts).set(userRuling(kind)).where(eq(contacts.id, contactId));
}

/** Same ruling across many contacts in ONE update — the People bulk bar's
 *  "Not a person" / "Is a person", shaped like `setContactsStarred`. */
export async function setContactsPersonKind(ids: string[], kind: PersonKind): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.update(contacts).set(userRuling(kind)).where(inArray(contacts.id, ids));
}
