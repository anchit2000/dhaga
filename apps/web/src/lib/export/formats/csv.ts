import { methodValues } from "@dhaga/core";
import type { ExportContact } from "../data";

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The spreadsheet half of the export. Free-text `location` lives here (and in
 * the JSON dump) rather than in the vCard, because a CSV column asserts nothing
 * about what the string IS — see ./vcard.ts for why an ADR would.
 */
export function contactsToCsv(rows: ExportContact[]): string {
  const header = [
    "name",
    "title",
    "company",
    "emails",
    "phones",
    "links",
    "location",
    "tags",
    "source",
    "created_at",
  ];
  const lines = rows.map((row) =>
    [
      row.name,
      row.title ?? "",
      row.companyName ?? "",
      methodValues(row.emails).join("; "),
      methodValues(row.phones).join("; "),
      methodValues(row.links).join("; "),
      row.location ?? "",
      row.tags.join("; "),
      row.source,
      row.createdAt.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}
