import { eq, inArray } from "drizzle-orm";
import { normalizeContactMethods } from "@dhaga/core";
import { companies, contacts } from "@/lib/db/schema";
import type { SyncableContact } from "@dhaga/core";
import type { DhagaDb } from "@/lib/db";

/** A Dhaga contact in the shape the merge core understands, plus the bits the
 *  reconcile needs about it that are NOT syncable (its id, how it got here). */
export interface LocalContact {
  id: string;
  /** contacts.source — "mentioned" stubs are AI-inferred and never pushed out. */
  source: string;
  contact: SyncableContact;
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Fold a contact into the canonical syncable shape.
 *
 * Applied to BOTH sides — the DB row and the contact the client observed —
 * because the three-way merge compares values literally. Normalising only one
 * side would make a trailing space read as an edit and push a phantom write
 * back to the phone on every single run.
 */
export function normalizeSyncable(input: SyncableContact): SyncableContact {
  return {
    name: input.name.trim(),
    nickname: trimOrNull(input.nickname),
    title: trimOrNull(input.title),
    company: trimOrNull(input.company),
    emails: normalizeContactMethods(input.emails),
    phones: normalizeContactMethods(input.phones),
    links: normalizeContactMethods(input.links),
    addresses: Array.isArray(input.addresses) ? input.addresses : [],
    importantDates: Array.isArray(input.importantDates) ? input.importantDates : [],
  };
}

/**
 * Load contacts as SyncableContacts in ONE query.
 *
 * `SyncableContact.company` is the organisation NAME; `contacts.company_id` is
 * an FK — the join below is the id→name half of that resolution (the name→id
 * half lives in ./write.ts). Called once per sync run, never per contact: a
 * getDb()/query fan-out over a 1000-contact batch is the pool-exhaustion bug
 * this codebase has shipped more than once (see lib/db/request-scope.ts).
 */
export async function loadLocalContacts(db: DhagaDb, ids?: string[]): Promise<LocalContact[]> {
  if (ids && ids.length === 0) return [];
  const query = db
    .select({
      id: contacts.id,
      source: contacts.source,
      name: contacts.name,
      nickname: contacts.nickname,
      title: contacts.title,
      company: companies.name,
      emails: contacts.emails,
      phones: contacts.phones,
      links: contacts.links,
      addresses: contacts.addresses,
      importantDates: contacts.importantDates,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));
  const rows = await (ids ? query.where(inArray(contacts.id, ids)) : query);
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    contact: normalizeSyncable(row),
  }));
}
