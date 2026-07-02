import { z } from "zod";

/**
 * A contact as extracted from any capture surface (pasted email signature,
 * card OCR text, LinkedIn page text). All capture surfaces converge on this
 * shape before the user reviews and saves it.
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

/** An empty extraction result, used as the base for manual entry forms. */
export function emptyExtractedContact(): ExtractedContact {
  return {
    name: "",
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
  };
}
