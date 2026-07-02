import { z } from "zod";

/**
 * Note → knowledge-graph extraction schema (BRD §6.3).
 * One structured LLM call per note; every derived row keeps the originating
 * note id as its receipt (`source_note_id` in storage).
 */

export const FACT_TYPES = ["role", "intent", "personal", "preference"] as const;

export const RELATIONSHIP_PREDICATES = [
  "works_at",
  "used_to_work_at",
  "knows",
  "reports_to",
  "invests_in",
  "competitor_of",
] as const;

export const factSchema = z.object({
  type: z.enum(FACT_TYPES),
  text: z.string().describe("The fact, phrased as a short standalone sentence"),
  confidence: z.number().describe("0–1; how directly the note states this"),
});

export const relationshipSchema = z.object({
  subject: z
    .string()
    .describe('Who the relationship is about; "contact" for the note subject'),
  predicate: z.enum(RELATIONSHIP_PREDICATES),
  object: z.string().describe("The company or person on the other end"),
  object_type: z.enum(["company", "person"]),
});

export const followUpSchema = z.object({
  action: z.string().describe("Concrete follow-up action the note implies"),
  due_hint: z
    .string()
    .nullable()
    .describe('Timing hint verbatim from the note (e.g. "next quarter"), or null'),
});

export const noteExtractionSchema = z.object({
  facts: z.array(factSchema),
  relationships: z.array(relationshipSchema),
  follow_ups: z.array(followUpSchema),
  tags: z
    .array(z.string())
    .describe("Lowercase topical tags, e.g. fintech, decision-maker"),
});

export type Fact = z.infer<typeof factSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type FollowUp = z.infer<typeof followUpSchema>;
export type NoteExtraction = z.infer<typeof noteExtractionSchema>;
