import { parseCsv } from "./parse-csv";
import { googleRowsToCandidates, isGoogleHeader } from "./google";
import { findLinkedInHeaderRow, linkedInRowsToCandidates } from "./linkedin";
import { vcardToCandidates } from "./vcard";
import type { ImportParseResult } from "./types";

export { parseCsv } from "./parse-csv";
export { isVcard, vcardToCandidates } from "./vcard";
export type { ImportCandidate, ImportFormat, ImportParseResult } from "./types";

/**
 * Detect the export format and turn the CSV text into review-ready
 * candidates. Pure and dependency-free: runs in the browser, so the raw
 * file never leaves the device — only rows the user selects are sent up.
 */
export function parseContactsCsv(text: string): ImportParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, error: "That file has no contact rows." };
  }

  const linkedInHeader = findLinkedInHeaderRow(rows);
  if (linkedInHeader >= 0) {
    const candidates = linkedInRowsToCandidates(
      rows[linkedInHeader],
      rows.slice(linkedInHeader + 1),
    );
    return { ok: true, format: "linkedin", candidates };
  }

  if (isGoogleHeader(rows[0])) {
    return { ok: true, format: "google", candidates: googleRowsToCandidates(rows[0], rows.slice(1)) };
  }

  return {
    ok: false,
    error:
      "Unrecognized CSV. Expected a Google Contacts export or a LinkedIn Connections export.",
  };
}

/**
 * Parse a vCard (.vcf) export into review-ready candidates. Like the CSV
 * path, this runs in the browser — the raw file never leaves the device.
 */
export function parseContactsVcard(text: string): ImportParseResult {
  const candidates = vcardToCandidates(text);
  if (candidates.length === 0) {
    return { ok: false, error: "No contacts found in that .vcf file." };
  }
  return { ok: true, format: "vcard", candidates };
}
