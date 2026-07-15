import { z } from "zod";

/**
 * Reusable sub-shapes for a rich contact. People carry several of each of
 * these, so every capture/import surface and the manual form converge on the
 * same object shapes here.
 *
 * Structured-outputs note (mirrors ./contact): optional data is expressed as a
 * required-but-`.nullable()` field, never `.optional()`, so the Zod-derived
 * JSON schema stays strict-mode compatible for LLM extraction.
 */

/**
 * A single email address, phone number, or link, with an optional human label
 * ("Work", "Home", "Mobile", "LinkedIn") and free-form note. Legacy rows and
 * older captures stored these as bare strings — {@link normalizeContactMethods}
 * coerces those, so nothing has to be migrated in the database.
 */
export const contactMethodSchema = z.object({
  value: z.string().describe("The email address, phone number, or URL"),
  label: z
    .string()
    .nullable()
    .describe('What kind it is: "Work", "Home", "Mobile", "LinkedIn", … or null'),
  note: z.string().nullable().describe("Any extra note about this entry, or null"),
});
export type ContactMethod = z.infer<typeof contactMethodSchema>;

/**
 * One job/role. Positions are the source of truth for employment; the first
 * current one (else the first) mirrors into the denormalised
 * `contacts.title` / `company_id` columns so existing list/detail/search/graph
 * reads keep working unchanged. Dates are verbatim text ("2019", "Jan 2020")
 * because imports and notes carry fuzzy dates, not calendar values.
 */
export const positionSchema = z.object({
  title: z.string().nullable().describe("Job title / role, or null"),
  company: z.string().nullable().describe("Employer / organisation name, or null"),
  department: z.string().nullable().describe("Team or department, or null"),
  current: z.boolean().describe("Whether this is a current role"),
  startedAt: z.string().nullable().describe('When it started, verbatim (e.g. "2019"), or null'),
  endedAt: z.string().nullable().describe("When it ended, verbatim, or null"),
  note: z.string().nullable().describe("Any extra note, or null"),
});
export type Position = z.infer<typeof positionSchema>;

/** A postal address. Structured parts + a free note; every part is optional. */
export const addressSchema = z.object({
  label: z.string().nullable().describe('"Home", "Work", … or null'),
  street: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable().describe("State / province / region, or null"),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  note: z.string().nullable(),
});
export type Address = z.infer<typeof addressSchema>;

/** A birthday, anniversary, or other date worth remembering. */
export const importantDateSchema = z.object({
  label: z.string().describe('What it marks: "Birthday", "Anniversary", …'),
  value: z.string().describe("The date, ISO or verbatim"),
  note: z.string().nullable(),
});
export type ImportantDate = z.infer<typeof importantDateSchema>;

/**
 * A catch-all label/value pair — the lossless landing spot for any import
 * field (Google/vCard/device) that has no dedicated home above.
 */
export const customFieldSchema = z.object({
  label: z.string().describe("Field name, e.g. from a vCard X- property"),
  value: z.string(),
});
export type CustomField = z.infer<typeof customFieldSchema>;

/** Coerce a legacy string or a partial object into a full ContactMethod. */
export function normalizeContactMethod(raw: unknown): ContactMethod {
  if (typeof raw === "string") return { value: raw, label: null, note: null };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return {
      value: typeof obj.value === "string" ? obj.value : "",
      label: typeof obj.label === "string" ? obj.label : null,
      note: typeof obj.note === "string" ? obj.note : null,
    };
  }
  return { value: "", label: null, note: null };
}

/**
 * Normalise a raw jsonb column (string[] from legacy rows, or object[] from
 * new writes) into ContactMethod[], dropping entries with no value. Every read
 * path funnels through this so the rest of the app only ever sees objects.
 */
export function normalizeContactMethods(raw: unknown): ContactMethod[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeContactMethod).filter((m) => m.value.trim().length > 0);
}

/** The bare values only — for search indexing, export columns, mailto, etc. */
export function methodValues(raw: unknown): string[] {
  return normalizeContactMethods(raw).map((m) => m.value);
}
