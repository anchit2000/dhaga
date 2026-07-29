import { entryKey } from "@dhaga/core/src/sync";
import { normalizeForMatch } from "@/lib/text-match";
import type { SyncableContact } from "@dhaga/core";
import type { LocalContact } from "./read";

/**
 * Identity fallback for when the provider's own id misses.
 *
 * External ids are NOT stable: a restore-from-backup, an account re-add or a
 * device migration re-mints every one of them. Treating a miss as "new contact"
 * would duplicate the user's entire address book on the first sync after a
 * restore — so a miss falls through to the same email → phone → name+company
 * ladder the CSV/vCard importer uses (lib/repo/import.ts).
 *
 * Email and phone keys come from the merge core's entryKey so "the same number"
 * means one thing across this feature: if the merge treats "+91 98765 43210" and
 * "098765 43210" as one entry, dedup cannot treat them as two people.
 */
export interface DedupIndex {
  byEmail: Map<string, string>;
  byPhone: Map<string, string>;
  byNameCompany: Map<string, string>;
}

function nameCompanyKey(contact: SyncableContact): string {
  return `${normalizeForMatch(contact.name)}|${normalizeForMatch(contact.company ?? "")}`;
}

/** Register one contact's keys. First writer wins, so the earliest-loaded
 *  contact stays the match target rather than a later same-key duplicate. */
export function indexContact(index: DedupIndex, id: string, contact: SyncableContact): void {
  for (const email of contact.emails) {
    const key = entryKey("emails", email);
    if (key && !index.byEmail.has(key)) index.byEmail.set(key, id);
  }
  for (const phone of contact.phones) {
    const key = entryKey("phones", phone);
    if (key && !index.byPhone.has(key)) index.byPhone.set(key, id);
  }
  const nameKey = nameCompanyKey(contact);
  if (nameKey.replace("|", "") && !index.byNameCompany.has(nameKey)) {
    index.byNameCompany.set(nameKey, id);
  }
}

export function buildDedupIndex(rows: LocalContact[]): DedupIndex {
  const index: DedupIndex = {
    byEmail: new Map(),
    byPhone: new Map(),
    byNameCompany: new Map(),
  };
  for (const row of rows) indexContact(index, row.id, row.contact);
  return index;
}

/** The existing Dhaga contact this observed contact is, or null. */
export function matchExisting(index: DedupIndex, contact: SyncableContact): string | null {
  for (const email of contact.emails) {
    const hit = index.byEmail.get(entryKey("emails", email));
    if (hit) return hit;
  }
  for (const phone of contact.phones) {
    const hit = index.byPhone.get(entryKey("phones", phone));
    if (hit) return hit;
  }
  return index.byNameCompany.get(nameCompanyKey(contact)) ?? null;
}
