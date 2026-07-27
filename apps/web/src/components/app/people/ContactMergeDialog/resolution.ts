import {
  computeScalarConflicts,
  type ContactMergeResolution,
  type ContactMethod,
  type MergeConflict,
} from "@dhaga/core";
import type { ContactMergeRecord } from "@/lib/repo/contacts";

/** The scalar fields the merge dialog lets the user resolve when they disagree. */
type MergeFieldKey = "name" | "nickname" | "location";
export const MERGE_SCALAR_FIELDS: { key: MergeFieldKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "nickname", label: "Nickname" },
  { key: "location", label: "Location" },
];

/** Fields where ≥2 distinct non-empty values compete — the only ones needing UI. */
export function mergeConflicts(records: ContactMergeRecord[]): MergeConflict[] {
  return computeScalarConflicts(records, MERGE_SCALAR_FIELDS);
}

function trimmed(value: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Default choice per conflict field: the primary's value when it's non-empty
 * (and thus one of the candidates), else the first non-empty candidate.
 */
export function defaultChoices(
  records: ContactMergeRecord[],
  targetId: string,
): Record<string, string> {
  const primary = records.find((record) => record.id === targetId);
  const choices: Record<string, string> = {};
  if (!primary) return choices;
  for (const conflict of mergeConflicts(records)) {
    const primaryValue = trimmed(primary[conflict.field as MergeFieldKey]);
    choices[conflict.field] =
      primaryValue && conflict.values.includes(primaryValue) ? primaryValue : conflict.values[0];
  }
  return choices;
}

/** Distinct case/space-normalised methods across every record, first-seen order. */
export function dedupeMethods(
  records: ContactMergeRecord[],
  field: "emails" | "phones" | "links",
): ContactMethod[] {
  const seen = new Set<string>();
  const out: ContactMethod[] = [];
  for (const record of records) {
    for (const method of record[field]) {
      const key = method.value.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(method);
    }
  }
  return out;
}

/** Distinct tags across every record, first-seen order. */
export function dedupeTags(records: ContactMergeRecord[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const record of records) {
    for (const tag of record.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** Agreed value for a field with no conflict: the lone non-empty value, or null. */
function agreedValue(records: ContactMergeRecord[], field: MergeFieldKey): string | null {
  for (const record of records) {
    const value = trimmed(record[field]);
    if (value) return value;
  }
  return null;
}

/**
 * Turn the primary pick + per-field choices into the server contract. Returns
 * null when the resolution can't be valid (no primary, or an empty name) so the
 * dialog can keep the merge button disabled rather than submit garbage.
 */
export function buildResolution(
  records: ContactMergeRecord[],
  targetId: string,
  choices: Record<string, string>,
): ContactMergeResolution | null {
  if (!records.some((record) => record.id === targetId)) return null;
  const conflicts = mergeConflicts(records);
  const resolve = (field: MergeFieldKey): string | null => {
    const conflict = conflicts.find((entry) => entry.field === field);
    if (conflict) return choices[field] ?? conflict.values[0];
    return agreedValue(records, field);
  };
  const name = resolve("name");
  if (!name) return null;
  return {
    targetId,
    sourceIds: records.filter((record) => record.id !== targetId).map((record) => record.id),
    name,
    nickname: resolve("nickname"),
    location: resolve("location"),
  };
}
