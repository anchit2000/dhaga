import { normalizeContactMethods } from "@dhaga/core";
import { itemGroups, vCardAddressLines, vCardDateLines } from "./entries";
import { vCardEscape, vCardMethodLine } from "./escape";
import type { ExportContact } from "../../data";

/**
 * The seed .vcf: Dhaga's contacts in the form an address book imports in bulk.
 *
 * `contacts.location` is deliberately absent from this card. It is free display
 * text ("Pune", "Bay Area", "Remote"), not postal data, and it is not a
 * SyncableContact field — so writing it as `ADR;TYPE=WORK:;;<it>;;;;` did not
 * preserve it, it PROMOTED it: the seeded record parses back as a real
 * structured address carrying a Work label the user never chose, and the first
 * sync pulls that fabricated entry into `contacts.addresses`. Same class of
 * mistake as the invented TYPE=WORK in ./escape.ts. It also largely duplicates
 * the real thing, since every importer derives `location` from
 * `addresses[0].city` on the way in. The CSV column and the JSON dump still
 * carry it, so the leave-with-all-your-data guarantee is untouched.
 */
export function contactsToVCards(rows: ExportContact[]): string {
  return rows
    .map((row) => {
      // One allocator per card: addresses and dates share the item-group
      // numbering, or their X-ABLabels cross over (see ./entries.ts).
      const group = itemGroups();
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vCardEscape(row.name)}`,
        // Nickname is a field the merge owns (SyncableContact), so leaving it
        // out of a seed .vcf is not a cosmetic loss — see ./entries.ts.
        row.nickname ? `NICKNAME:${vCardEscape(row.nickname)}` : null,
        row.title ? `TITLE:${vCardEscape(row.title)}` : null,
        row.companyName ? `ORG:${vCardEscape(row.companyName)}` : null,
        ...normalizeContactMethods(row.emails).map((m) => vCardMethodLine("EMAIL", m)),
        ...normalizeContactMethods(row.phones).map((m) => vCardMethodLine("TEL", m)),
        ...normalizeContactMethods(row.links).map((m) => `URL:${vCardEscape(m.value)}`),
        ...vCardAddressLines(row.addresses, group),
        ...vCardDateLines(row.importantDates, group),
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\r\n");
    })
    .join("\r\n");
}
