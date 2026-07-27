import { z } from "zod";

/**
 * How the user resolved a contact merge in the review dialog: which record
 * survives (`targetId`), which records fold into it (`sourceIds`), and the
 * chosen value for each scalar field that had competing values. This is the
 * whole contract the merge action needs to rewrite the graph and tombstone the
 * losing records — nothing here is derived server-side.
 */
export const contactMergeResolutionSchema = z.object({
  targetId: z.string(),
  sourceIds: z.array(z.string()).min(1),
  name: z.string().min(1),
  nickname: z.string().nullable(),
  location: z.string().nullable(),
});

export type ContactMergeResolution = z.infer<typeof contactMergeResolutionSchema>;

/**
 * The company equivalent of {@link contactMergeResolutionSchema}: the surviving
 * company (`targetId`), the companies folded into it (`sourceIds`), and the
 * resolved scalar fields (name / domain / sector).
 */
export const companyMergeResolutionSchema = z.object({
  targetId: z.string(),
  sourceIds: z.array(z.string()).min(1),
  name: z.string().min(1),
  domain: z.string().nullable(),
  sector: z.string().nullable(),
});

export type CompanyMergeResolution = z.infer<typeof companyMergeResolutionSchema>;

/**
 * One scalar field on which the records being merged disagree. `values` holds
 * the DISTINCT candidate values (in first-seen order) the merge dialog offers
 * the user to choose between for `field`.
 */
export interface MergeConflict {
  field: string;
  label: string;
  values: string[];
}

/**
 * Pure conflict finder for a merge dialog. For each requested field, gathers
 * the distinct, trimmed, non-empty string values across `records`, and returns
 * the field ONLY when 2+ distinct values compete (i.e. the user must choose).
 * Fields where every record agrees — or is blank/null — need no prompt and are
 * omitted. No I/O and no mutation; safe to run on the client while previewing a
 * merge.
 */
export function computeScalarConflicts<T>(
  records: T[],
  fields: { key: keyof T; label: string }[],
): MergeConflict[] {
  const conflicts: MergeConflict[] = [];
  for (const { key, label } of fields) {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const record of records) {
      const raw = record[key];
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (trimmed === "" || seen.has(trimmed)) continue;
      seen.add(trimmed);
      values.push(trimmed);
    }
    if (values.length >= 2) {
      conflicts.push({ field: String(key), label, values });
    }
  }
  return conflicts;
}
