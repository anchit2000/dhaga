import { z } from "zod";

/**
 * Person-vs-service classification: a phone or address-book import drags the
 * vegetable vendor, the cab office and "Ola Support" into the graph alongside
 * real people. A nightly Batch pass labels each row so only humans reach the
 * proactive suggestion surfaces.
 *
 * Only "service" suppresses a row, and only from suggestions — it stays fully
 * findable in People, search and export. So the expensive failure is a wrong
 * "service" on a real person: they quietly stop being suggested. "unknown" is
 * the safe answer whenever the record is thin, which is why it is a kind
 * rather than a low confidence on a guess.
 *
 * No rationale field on purpose: it would be a second class of model-written
 * free text about a private third party, stored for zero ranking value.
 */

export const PERSON_KINDS = ["person", "service", "unknown"] as const;

export const personClassificationSchema = z.object({
  kind: z
    .enum(PERSON_KINDS)
    .describe(
      "person for an individual human the user could message; service for a business, shop, support line, desk or delivery channel; unknown when the record does not say enough to tell",
    ),
  confidence: z
    .number()
    .describe("0–1; how certain you are of the kind you returned"),
});

export type PersonClassification = z.infer<typeof personClassificationSchema>;
export type PersonKind = (typeof PERSON_KINDS)[number];
