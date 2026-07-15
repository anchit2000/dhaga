import { z } from "zod";
import {
  addressSchema,
  contactMethodSchema,
  customFieldSchema,
  importantDateSchema,
  positionSchema,
  type Position,
} from "./contact-fields";

/**
 * A contact as extracted from any capture surface (pasted email signature,
 * card OCR text, LinkedIn page text). All capture surfaces converge on this
 * shape before the user reviews and saves it.
 *
 * Deliberately kept lean and string-valued: extraction/OCR sees one primary
 * role and bare emails/phones, and every capture handler, CSV importer, and
 * test constructs this. The richer, editable shape people actually curate is
 * {@link contactProfileSchema} below; `profileFromExtracted` lifts one into
 * the other (a single current position, unlabeled methods) at the write
 * boundary, so capture output becomes editable without duplicating logic.
 *
 * Structured-outputs note: every field is required (nullable, not optional)
 * so the Zod-derived JSON schema stays strict-mode compatible.
 */
export const extractedContactSchema = z.object({
  name: z.string().describe("Full name of the person"),
  title: z.string().nullable().describe("Job title, or null if absent"),
  company: z.string().nullable().describe("Company or organisation name, or null"),
  emails: z.array(z.string()).describe("Email addresses found, empty if none"),
  phones: z.array(z.string()).describe("Phone numbers found, empty if none"),
  links: z
    .array(z.string())
    .describe("Websites / LinkedIn / social URLs found, empty if none"),
  location: z.string().nullable().describe("City / country if stated, or null"),
});

export type ExtractedContact = z.infer<typeof extractedContactSchema>;

/**
 * The full editable + importable contact. People hold several jobs over time,
 * carry work/home/mobile numbers, and (from a Google/vCard/device import) a
 * long tail of fields — so employment is a list of {@link positionSchema},
 * emails/phones/links are labeled {@link contactMethodSchema}, and
 * `customFields` is a lossless catch-all so an import never silently drops
 * data. This is what the manual add/edit form reads and writes.
 */
export const contactProfileSchema = z.object({
  name: z.string(),
  nickname: z.string().nullable(),
  positions: z.array(positionSchema),
  emails: z.array(contactMethodSchema),
  phones: z.array(contactMethodSchema),
  links: z.array(contactMethodSchema),
  addresses: z.array(addressSchema),
  importantDates: z.array(importantDateSchema),
  customFields: z.array(customFieldSchema),
  location: z.string().nullable(),
});

export type ContactProfile = z.infer<typeof contactProfileSchema>;

/** An empty extraction result, used as the base for capture review. */
export function emptyExtractedContact(): ExtractedContact {
  return { name: "", title: null, company: null, emails: [], phones: [], links: [], location: null };
}

/** An empty full profile — the seed for the manual add form. */
export function emptyContactProfile(): ContactProfile {
  return {
    name: "",
    nickname: null,
    positions: [],
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
    customFields: [],
    location: null,
  };
}

/**
 * Lift a capture-time ExtractedContact into the editable profile: its single
 * title/company becomes one current position, and bare method strings become
 * unlabeled ContactMethods the user can label later.
 */
export function profileFromExtracted(extracted: ExtractedContact): ContactProfile {
  const toMethods = (values: string[]) =>
    values.map((value) => ({ value, label: null, note: null }));
  const hasPrimary = Boolean(extracted.title?.trim() || extracted.company?.trim());
  return {
    name: extracted.name,
    nickname: null,
    positions: hasPrimary
      ? [
          {
            title: extracted.title,
            company: extracted.company,
            department: null,
            current: true,
            startedAt: null,
            endedAt: null,
            note: null,
          },
        ]
      : [],
    emails: toMethods(extracted.emails),
    phones: toMethods(extracted.phones),
    links: toMethods(extracted.links),
    addresses: [],
    importantDates: [],
    customFields: [],
    location: extracted.location,
  };
}

/**
 * The primary role — first current, else the first listed — whose title and
 * company mirror into the denormalised `contacts.title` / `company_id` columns
 * that existing list/detail/search/graph reads still depend on.
 */
export function primaryPosition(positions: Position[]): Position | null {
  return positions.find((p) => p.current) ?? positions[0] ?? null;
}
