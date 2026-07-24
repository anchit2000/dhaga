import { profileFromExtracted } from "@dhaga/core";
import { rowToRecord } from "./types";
import type { ImportCandidate } from "./types";

/**
 * LinkedIn Connections.csv (the user's own data export — the ToS-safe bulk
 * channel, BRD §6.7). The file starts with a "Notes:" preamble before the
 * real header row, so the header is located by content, not position.
 */

export function findLinkedInHeaderRow(rows: string[][]): number {
  return rows.findIndex(
    (row) => row.includes("First Name") && row.includes("Connected On"),
  );
}

export function linkedInRowsToCandidates(
  headers: string[],
  rows: string[][],
): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];
  for (const row of rows) {
    const record = rowToRecord(headers, row);
    const name = [record["First Name"], record["Last Name"]].filter(Boolean).join(" ");
    if (!name) continue;

    const connectedOn = record["Connected On"];
    candidates.push({
      contact: profileFromExtracted({
        name,
        title: record["Position"] || null,
        company: record["Company"] || null,
        emails: record["Email Address"] ? [record["Email Address"]] : [],
        phones: [],
        links: record["URL"] ? [record["URL"]] : [],
        location: null,
      }),
      receipt: `Imported from LinkedIn Connections export${
        connectedOn ? ` · connected ${connectedOn}` : ""
      }`,
    });
  }
  return candidates;
}
