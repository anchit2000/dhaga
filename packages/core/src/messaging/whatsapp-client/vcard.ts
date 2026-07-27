/**
 * Synthesise a vCard 3.0 string from WhatsApp's STRUCTURED contact object —
 * the Cloud API sends contact JSON, not a vCard. Emits only the properties the
 * importer reads (FN, N, ORG, TITLE, TEL, EMAIL) and skips empty ones, so a
 * nameless card degrades cleanly downstream. Value escaping is the inverse of
 * the importer's vcardUnescape (../../../lib/import/vcard/decode via the web app).
 */
import { asArray, asRecord, asString } from "./narrow";

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function synthesizeVCard(contact: Record<string, unknown>): string {
  const name = asRecord(contact.name);
  const org = asRecord(contact.org);
  const formatted = asString(name?.formatted_name);
  const family = asString(name?.last_name) ?? "";
  const given = asString(name?.first_name) ?? "";
  const additional = asString(name?.middle_name) ?? "";
  const prefix = asString(name?.prefix) ?? "";
  const suffix = asString(name?.suffix) ?? "";
  const fn = formatted ?? [prefix, given, additional, family, suffix].filter(Boolean).join(" ");
  const company = asString(org?.company);
  const title = asString(org?.title);

  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  if (fn) lines.push(`FN:${escapeVCard(fn)}`);
  if (family || given || additional || prefix || suffix) {
    lines.push(`N:${[family, given, additional, prefix, suffix].map(escapeVCard).join(";")}`);
  }
  if (company) lines.push(`ORG:${escapeVCard(company)}`);
  if (title) lines.push(`TITLE:${escapeVCard(title)}`);
  for (const phoneRaw of asArray(contact.phones)) {
    const phone = asString(asRecord(phoneRaw)?.phone);
    if (phone) lines.push(`TEL:${escapeVCard(phone)}`);
  }
  for (const emailRaw of asArray(contact.emails)) {
    const email = asString(asRecord(emailRaw)?.email);
    if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
