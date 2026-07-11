import { rowToRecord } from "./types";
import type { ImportCandidate } from "./types";

/**
 * Google Contacts CSV export (contacts.google.com → Export). Two header
 * generations exist in the wild; both are mapped:
 *   new (2024+): "First Name"/"Last Name", "Organization Name"/"Organization Title"
 *   old:         "Given Name"/"Family Name", "Organization 1 - Name"/"... - Title"
 * Multi-valued cells use Google's " ::: " separator.
 */

const EMAIL_HEADER = /^E-mail \d+ - Value$/;
const PHONE_HEADER = /^Phone \d+ - Value$/;
const WEBSITE_HEADER = /^Website \d+ - Value$/;
const ADDRESS_HEADER = /^Address \d+ - Formatted$/;

export function isGoogleHeader(headers: string[]): boolean {
  return (
    headers.some((header) => EMAIL_HEADER.test(header)) ||
    headers.includes("Organization Name") ||
    headers.includes("Organization 1 - Name")
  );
}

function first(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return "";
}

function multiValues(record: Record<string, string>, pattern: RegExp): string[] {
  return Object.keys(record)
    .filter((header) => pattern.test(header))
    .flatMap((header) => record[header].split(":::"))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function googleRowsToCandidates(
  headers: string[],
  rows: string[][],
): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];
  for (const row of rows) {
    const record = rowToRecord(headers, row);
    const name =
      [
        first(record, "First Name", "Given Name"),
        first(record, "Middle Name", "Additional Name"),
        first(record, "Last Name", "Family Name"),
      ]
        .filter(Boolean)
        .join(" ") || record["Name"];
    if (!name) continue;

    const labels = first(record, "Labels", "Group Membership");
    const notes = record["Notes"];
    const receipt = [
      `Imported from Google Contacts export${labels ? ` · labels: ${labels}` : ""}`,
      notes ? `Google note: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    candidates.push({
      contact: {
        name,
        title: first(record, "Organization Title", "Organization 1 - Title") || null,
        company: first(record, "Organization Name", "Organization 1 - Name") || null,
        emails: multiValues(record, EMAIL_HEADER),
        phones: multiValues(record, PHONE_HEADER),
        links: multiValues(record, WEBSITE_HEADER),
        location: multiValues(record, ADDRESS_HEADER)[0] ?? null,
      },
      receipt,
    });
  }
  return candidates;
}
