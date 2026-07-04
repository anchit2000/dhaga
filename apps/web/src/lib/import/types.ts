import type { ExtractedContact } from "@dhaga/core";

export type ImportFormat = "google" | "linkedin";

export interface ImportCandidate {
  contact: ExtractedContact;
  /** Becomes the contact's capture_source note — the receipt for every imported field. */
  receipt: string;
}

export type ImportParseResult =
  | { ok: true; format: ImportFormat; candidates: ImportCandidate[] }
  | { ok: false; error: string };

/** Read one row into a header-keyed record; missing cells become "". */
export function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = (row[index] ?? "").trim();
  });
  return record;
}
