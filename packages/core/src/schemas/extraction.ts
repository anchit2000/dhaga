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

const predicateSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
  .describe(
    "A concise snake_case relationship, such as parent_of, interviewed_with, or advised",
  );

export const factSchema = z.object({
  type: z.enum(FACT_TYPES),
  text: z.string().describe("The fact, phrased as a short standalone sentence"),
  confidence: z.number().describe("0–1; how directly the note states this"),
});

export const relationshipSchema = z.object({
  subject: z
    .string()
    .describe('Who the relationship is about; "contact" for the note subject'),
  predicate: predicateSchema,
  object: z
    .string()
    .describe("The company, person, or custom entity on the other end"),
  // "entity" = one of the user's custom node types (a gym, a school, a club…)
  // listed in the request; only used when that list names a matching type.
  object_type: z.enum(["company", "person", "entity"]),
  // Required-but-nullable (never .optional()) so the Zod-derived JSON schema
  // stays strict-mode compatible for structured outputs — see schemas/contact.
  entity_type_hint: z
    .string()
    .nullable()
    .describe(
      'When object_type is "entity": the slug of the user\'s node type it matches (e.g. "gym"). Otherwise null.',
    ),
  // Required-but-nullable, same reason as entity_type_hint. Discriminates a real
  // name from a bare relative/role reference so the graph can relabel a bare
  // reference off the note's subject ("his son" on a note about Prashant ⇒
  // "Prashant's son") instead of minting a phantom literally named "his son".
  // Null = the model didn't decide; resolveObject's possessive-prefix backstop
  // then decides. An explicit true is never overridden — a named person stays named.
  object_is_named: z
    .boolean()
    .nullable()
    .describe(
      'true when `object` is a specific person\'s name (e.g. "Ajay Kumar"); false when it is a bare relative or role reference with no name, like "his son" or "her manager".',
    ),
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
