import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { contacts, notes } from "@/lib/db/schema";
import { PERSON_KIND_BY } from "@/utils/constants/person-kind";

/**
 * WHO THE NIGHTLY CLASSIFIER IS EVEN ALLOWED TO NOMINATE.
 *
 * This predicate, not the prompt, is what makes the pass safe. The worst
 * failure this design can have is labelling a real friend a "service" and
 * quietly dropping them off every proactive surface — so a contact the user has
 * demonstrably ACTED ON is never nominated at all. The model gets no vote on
 * someone the user has already treated as a person. Every clause below is one
 * such act, or the user's own explicit ruling.
 *
 * There is deliberately NO note-change resweep: "has a live note" already
 * exempts the row entirely, so a note arriving later removes the row from this
 * set rather than making it due again.
 *
 * Idempotent by construction — re-running it re-selects exactly the rows that
 * are still due — which is why this predicate plus PERSON_CLASSIFICATION_RUN_CAP
 * IS the backfill and no one-shot script exists to drift away from it.
 */
export const dueForClassification = and(
  // A user ruling is a HARD LOCK, not a preference: person_kind_by = 'user'
  // means the user appealed a guess, and the sweep must never re-judge it.
  // `<>` is safe here (unlike person_kind): the column is NOT NULL, default
  // 'model', so there is no NULL to swallow the comparison.
  ne(contacts.personKindBy, PERSON_KIND_BY[1]),
  // "mentioned" rows are extraction stubs the graph created for a name in a
  // note, not address-book imports — they are not what this pass exists to
  // clean up, and surfaceableContact already suppresses them.
  ne(contacts.source, "mentioned"),
  // Starred = the user explicitly favourited them. That is a person.
  eq(contacts.starred, false),
  // Watched for signals = the user opted this contact into proactive web
  // monitoring. Nobody watches their vegetable vendor's career.
  eq(contacts.watchedForSignals, false),
  // A keep-in-touch cadence is the user asking to be reminded about them.
  isNull(contacts.reachOutEveryDays),
  // "I reached out" was recorded at least once — an act on a human.
  isNull(contacts.lastReachedOutAt),
  // Any live (non-tombstoned) note about them. Writing a note about someone is
  // the strongest "this is a person I deal with" signal in the graph, and it is
  // also the case where a wrong "service" would destroy the most context.
  sql`NOT EXISTS (
    SELECT 1 FROM ${notes}
    WHERE ${notes.contactId} = ${contacts.id} AND ${notes.deletedAt} IS NULL
  )`,
  // Never judged yet, or edited since the last judgment — a contact the user
  // filled in details for deserves a fresh look. `updateContact` bumps
  // `updated_at` (lib/repo/contacts/write.ts contactValues), while the user's
  // own person-kind ruling deliberately does NOT (person-kind.ts), so this
  // clause cannot re-open a row purely because its label was set.
  or(isNull(contacts.personClassifiedAt), gt(contacts.updatedAt, contacts.personClassifiedAt)),
);
