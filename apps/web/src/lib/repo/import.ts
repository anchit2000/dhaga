import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { createContact } from "./contacts";
import { addNote } from "./notes";
import { emitWebhook } from "@/lib/webhooks";
import { normalizeForMatch } from "@/lib/text-match";
import { methodValues } from "@dhaga/core";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

export interface ImportSummary {
  created: number;
  skipped: number;
}

/**
 * Bulk-create reviewed CSV candidates. Dedup makes re-importing a newer
 * export safe (the LinkedIn re-import path, BRD §6.7): a candidate is
 * skipped when any of its emails already exists in the graph, or when
 * name + company match an existing contact exactly. Every created contact
 * gets a capture_source note as the receipt for its imported fields.
 * Receipt notes are not embedded: their fields already live on the contact
 * row (searchable via SQL), and embedding hundreds of rows at import time
 * would stall the request for minutes.
 */
export async function importContacts(
  candidates: ImportCandidate[],
  format: ImportFormat,
): Promise<ImportSummary> {
  const db = await getDb();
  const existing = await db
    .select({
      name: contacts.name,
      emails: contacts.emails,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  const emailSeen = new Set<string>();
  const nameSeen = new Set<string>();
  for (const row of existing) {
    // row.emails is labeled objects now (and legacy string rows) — normalise.
    for (const email of methodValues(row.emails)) emailSeen.add(email.toLowerCase());
    nameSeen.add(
      `${normalizeForMatch(row.name)}|${normalizeForMatch(row.companyName ?? "")}`,
    );
  }

  let created = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const emails = candidate.contact.emails.map((email) => email.toLowerCase());
    const nameKey = `${normalizeForMatch(candidate.contact.name)}|${normalizeForMatch(
      candidate.contact.company ?? "",
    )}`;
    if (emails.some((email) => emailSeen.has(email)) || nameSeen.has(nameKey)) {
      skipped++;
      continue;
    }
    const id = await createContact(candidate.contact, "import", { skipWebhook: true });
    await addNote(id, "capture_source", candidate.receipt);
    emails.forEach((email) => emailSeen.add(email));
    nameSeen.add(nameKey);
    created++;
  }

  if (created > 0) {
    await emitWebhook("contacts.imported", { count: created, format });
  }
  return { created, skipped };
}
