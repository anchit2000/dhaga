import type { MergeConflict } from "@dhaga/core";
import type { CompanyMergeRecord } from "@/lib/repo/companies";

/** The scalar fields the resolver offers a choice for when they disagree. */
export const MERGE_FIELDS: { key: keyof CompanyMergeRecord; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "domain", label: "Domain" },
  { key: "sector", label: "Sector" },
];

/** Trimmed string value of a record field, or "" for null/non-string. */
export function scalarField(record: CompanyMergeRecord, field: string): string {
  const raw = record[field as keyof CompanyMergeRecord];
  return typeof raw === "string" ? raw.trim() : "";
}

/** The chosen value for a conflict: the user's pick, else the survivor's value
 *  (falling back to the first candidate). */
export function effectiveChoice(
  conflict: MergeConflict,
  target: CompanyMergeRecord | null,
  choices: Record<string, string>,
): string {
  const primaryValue = target ? scalarField(target, conflict.field) : "";
  const fallback = conflict.values.includes(primaryValue) ? primaryValue : conflict.values[0];
  return choices[conflict.field] ?? fallback;
}

/** Final value for a scalar field: the conflict pick, or the single known value
 *  across the records (null when every record is blank). */
export function resolvedField(
  field: "name" | "domain" | "sector",
  conflicts: MergeConflict[],
  list: CompanyMergeRecord[],
  target: CompanyMergeRecord | null,
  choices: Record<string, string>,
): string | null {
  const conflict = conflicts.find((entry) => entry.field === field);
  if (conflict) return effectiveChoice(conflict, target, choices);
  const distinct = [...new Set(list.map((record) => scalarField(record, field)).filter(Boolean))];
  return distinct[0] ?? null;
}
