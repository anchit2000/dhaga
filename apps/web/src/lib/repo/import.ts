import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { createContactProfile } from "@/lib/repo/contacts/write";
import { addNote } from "./notes";
import { emitWebhook } from "@/lib/webhooks";
import { normalizeForMatch } from "@/lib/text-match";
import { methodValues, primaryPosition } from "@dhaga/core";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

export interface ImportSummary {
  created: number;
  skipped: number;
}

/**
 * Bulk-create reviewed CSV candidates. Dedup makes re-importing a newer
 * export safe (the LinkedIn re-import path, BRD §6.7): a candidate is
 * skipped when any of its emails already exists in the graph, when any of
 * its (digit-normalized) phones already exists — device contacts often
 * carry no email, so phone dedup keeps .vcf re-imports safe — or when
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
      phones: contacts.phones,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  const normalizePhone = (phone: string): string => phone.replace(/[^\d+]/g, "");

  const emailSeen = new Set<string>();
  const phoneSeen = new Set<string>();
  const nameSeen = new Set<string>();
  for (const row of existing) {
    // row.emails/phones are labeled objects now (and legacy string rows) — normalise.
    for (const email of methodValues(row.emails)) emailSeen.add(email.toLowerCase());
    for (const phone of methodValues(row.phones)) {
      const normalized = normalizePhone(phone);
      if (normalized) phoneSeen.add(normalized);
    }
    nameSeen.add(
      `${normalizeForMatch(row.name)}|${normalizeForMatch(row.companyName ?? "")}`,
    );
  }

  let created = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const emails = methodValues(candidate.contact.emails).map((email) => email.toLowerCase());
    const phones = methodValues(candidate.contact.phones)
      .map(normalizePhone)
      .filter(Boolean);
    const nameKey = `${normalizeForMatch(candidate.contact.name)}|${normalizeForMatch(
      primaryPosition(candidate.contact.positions)?.company ?? "",
    )}`;
    if (
      emails.some((email) => emailSeen.has(email)) ||
      phones.some((phone) => phoneSeen.has(phone)) ||
      nameSeen.has(nameKey)
    ) {
      skipped++;
      continue;
    }
    const id = await createContactProfile(candidate.contact, "import", { skipWebhook: true });
    await addNote(id, "capture_source", candidate.receipt);
    emails.forEach((email) => emailSeen.add(email));
    phones.forEach((phone) => phoneSeen.add(phone));
    nameSeen.add(nameKey);
    created++;
  }

  if (created > 0) {
    await emitWebhook("contacts.imported", { count: created, format });
  }
  return { created, skipped };
}
