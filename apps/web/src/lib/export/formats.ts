import type { ExportContact } from "./data";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
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
      row.emails.join("; "),
      row.phones.join("; "),
      row.links.join("; "),
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
    .replaceAll("\n", "\\n");
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
        ...row.emails.map((email) => `EMAIL;TYPE=WORK:${vCardEscape(email)}`),
        ...row.phones.map((phone) => `TEL;TYPE=WORK:${vCardEscape(phone)}`),
        ...row.links.map((link) => `URL:${vCardEscape(link)}`),
        row.location ? `ADR;TYPE=WORK:;;${vCardEscape(row.location)};;;;` : null,
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\r\n");
    })
    .join("\r\n");
}
