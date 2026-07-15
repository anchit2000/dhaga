import { methodValues, normalizeContactMethods } from "@dhaga/core";
import type { ExportContact } from "./data";

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** A vCard TYPE token from a method label ("Work Cell" → WORK-CELL); WORK when
 *  unlabeled, preserving the prior default for capture/import-created rows. */
function vCardType(label: string | null): string {
  return (label ?? "WORK").toUpperCase().replace(/[^A-Z0-9-]/g, "-") || "WORK";
}

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

function vCardEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n");
}

export function contactsToVCards(rows: ExportContact[]): string {
  return rows
    .map((row) => {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vCardEscape(row.name)}`,
        row.title ? `TITLE:${vCardEscape(row.title)}` : null,
        row.companyName ? `ORG:${vCardEscape(row.companyName)}` : null,
        ...normalizeContactMethods(row.emails).map(
          (m) => `EMAIL;TYPE=${vCardType(m.label)}:${vCardEscape(m.value)}`,
        ),
        ...normalizeContactMethods(row.phones).map(
          (m) => `TEL;TYPE=${vCardType(m.label)}:${vCardEscape(m.value)}`,
        ),
        ...normalizeContactMethods(row.links).map((m) => `URL:${vCardEscape(m.value)}`),
        row.location ? `ADR;TYPE=WORK:;;${vCardEscape(row.location)};;;;` : null,
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\r\n");
    })
    .join("\r\n");
}
