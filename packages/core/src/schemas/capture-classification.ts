import { z } from "zod";
import { extractedContactSchema } from "./contact";

/**
 * Note-capture classification, folded into the ONE quick-add extraction call
 * (see apps/web/src/lib/ai/contact-extraction.ts). The same structured output
 * that parses contact fields ALSO reports whether the captured text is really a
 * NOTE ABOUT A PERSON — so a note like "Met Priya, discussed the round" is
 * detected without a second AI round-trip or a second metered action.
 *
 * Structured-outputs note: required-but-nullable (never .optional()) so the
 * Zod-derived JSON schema stays strict-mode compatible — mirrors schemas/contact.
 */
const captureClassificationShape = {
  isNoteAboutPerson: z
    .boolean()
    .describe(
      'true only when the text reads as an observation/log about a specific named person (e.g. "Met Priya, discussed the Series A"), NOT an email signature, business card, or badge.',
    ),
  subjectName: z
    .string()
    .nullable()
    .describe(
      'The person the note is about, as written (e.g. "Priya"); null when isNoteAboutPerson is false or no name is present.',
    ),
  noteBody: z
    .string()
    .nullable()
    .describe(
      "The note to store — the user's words, lightly cleaned, never invented; null when isNoteAboutPerson is false.",
    ),
} as const;

export const captureClassificationSchema = z.object(captureClassificationShape);
export type CaptureClassification = z.infer<typeof captureClassificationSchema>;

/**
 * The quick-add capture schema: contact fields + the note classification, in a
 * single structured output. `extractedContactSchema` is intentionally left
 * untouched (26+ construction sites and the offline heuristic parser depend on
 * its exact shape) — the classification rides on top only for this one call.
 */
export const captureExtractionSchema = extractedContactSchema.extend(
  captureClassificationShape,
);
export type CaptureExtraction = z.infer<typeof captureExtractionSchema>;

/** The neutral classification used on the offline/no-AI paths: not a note, so
 *  capture falls through to the existing contact-add behavior. */
export function emptyCaptureClassification(): CaptureClassification {
  return { isNoteAboutPerson: false, subjectName: null, noteBody: null };
}
