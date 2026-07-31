import { vCardEscape } from "./escape";
import type { Address, ImportantDate } from "@dhaga/core";

/**
 * The multi-value properties of a card, and the Apple item-group ids they share.
 *
 * Both functions here exist for one reason: a field the seed .vcf DROPS is not
 * merely missing on the phone, it is deleted in Dhaga on the second sync. Run
 * one keeps Dhaga's value (the phone is silent, so nothing is adjudicated) but
 * records the merged result as the base; run two then reads "in the base, gone
 * from the phone" as a deletion and clears it, silently and with no conflict.
 */

/**
 * Apple item-group ids, allocated once per CARD and shared by every grouped
 * property on it.
 *
 * A grouped property finds its label by matching group id, so addresses and
 * dates must not number themselves independently: two `item1.` groups on one
 * card and lib/import/vcard's resolveLabel hands the address the date's label.
 */
export function itemGroups(): () => string {
  let n = 0;
  return () => `item${(n += 1)}`;
}

/**
 * Postal addresses as ADR lines — one per entry of `contacts.addresses`, which
 * is the multi-value field the sync merge actually owns. (`contacts.location`
 * is free text and is deliberately not written as an ADR — see ./index.ts.)
 *
 * The label rides Apple's item-group `X-ABLabel` rather than a TYPE token
 * because it has to come back VERBATIM. addressKey (core sync/keys.ts) keys an
 * entry on its five postal parts only, so a mangled label does NOT fork the
 * entry into a duplicate — it makes the same entry compare unequal, and two
 * different non-blank labels on a first link are a conflict per address per
 * contact. `TYPE=HOME` reads back as "Home", so a label stored as "home" would
 * return changed; X-ABLabel returns whatever the user typed.
 *
 * An unlabelled address gets no group and no TYPE at all — the same rule as
 * vCardMethodLine: never invent a label the user did not choose.
 */
export function vCardAddressLines(addresses: Address[], group: () => string): string[] {
  const lines: string[] = [];
  // Same defensive read as repo/sync/read.ts: the column is jsonb, so a row
  // written before the default landed can still hand back a non-array.
  for (const address of Array.isArray(addresses) ? addresses : []) {
    // ADR is pobox;ext;street;city;region;postal;country. Dhaga models neither
    // of the first two, so they stay empty.
    const parts = [
      address.street,
      address.city,
      address.region,
      address.postalCode,
      address.country,
    ];
    // An entry with no postal part at all cannot be read back — lib/import/vcard
    // drops it, and so does every address book — so the line would be noise.
    if (parts.every((part) => !part?.trim())) continue;
    const value = parts.map((part) => vCardEscape((part ?? "").trim())).join(";");
    const label = address.label?.trim();
    if (!label) {
      lines.push(`ADR:;;${value}`);
      continue;
    }
    const id = group();
    lines.push(`${id}.ADR:;;${value}`);
    lines.push(`${id}.X-ABLabel:${vCardEscape(label)}`);
  }
  return lines;
}

/**
 * Important dates: BDAY for the birthday, and Apple's item-group `X-ABDATE` +
 * `X-ABLabel` pair for everything else, which is what iCloud/iOS emit and what
 * lib/import/vcard reads back (a bare `X-ABDATE;TYPE=Anniversary` loses its
 * label on the way in, and vCard 4.0's ANNIVERSARY has no meaning in the 3.0
 * card we write).
 */
export function vCardDateLines(dates: ImportantDate[], group: () => string): string[] {
  const lines: string[] = [];
  // Same defensive read as repo/sync/read.ts: the column is jsonb, so a row
  // written before the default landed can still hand back a non-array.
  for (const date of Array.isArray(dates) ? dates : []) {
    const value = date.value.trim();
    if (!value) continue;
    if (date.label.trim().toLowerCase() === "birthday") {
      lines.push(`BDAY:${vCardEscape(value)}`);
      continue;
    }
    const id = group();
    lines.push(`${id}.X-ABDATE:${vCardEscape(value)}`);
    lines.push(`${id}.X-ABLabel:${vCardEscape(date.label.trim() || "Date")}`);
  }
  return lines;
}
