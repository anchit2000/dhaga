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
      'true when `object` is a specific person\'s name (e.g. "Rohan Iyer"); false when it is a bare relative or role reference with no name, like "his son" or "her manager".',
    ),
  // Required-but-nullable, same reason as above. Structured detail for an
  // employment/education affiliation, so the edge can also become a position
  // row (a job or a degree) instead of only an edge. All four stay null for a
  // person-to-person or entity relationship, which has no role to record —
  // existing behaviour for those is unchanged.
  role_title: z
    .string()
    .nullable()
    .describe(
      'The job title, or the degree/field of study for a school (e.g. "Head of Product", "BSc Computer Science"). Null when the note does not state one.',
    ),
  is_current: z
    .boolean()
    .nullable()
    .describe(
      "true when the affiliation is ongoing, false when it has ended. Null when the note does not say, or this is not an affiliation.",
    ),
  started_at: z
    .string()
    .nullable()
    .describe(
      'When the affiliation started, as loosely as the note states it ("2023", "2023-04"). Null when unknown.',
    ),
  ended_at: z
    .string()
    .nullable()
    .describe(
      "When the affiliation ended, in the same loose format. Null when unknown or still ongoing.",
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

/**
 * Read-side variant of {@link relationshipSchema}, for extractions that were
 * already PERSISTED (a `confirmations.payload`) rather than just returned by
 * the model.
 *
 * The schema above must keep every late-added field `.nullable()` and never
 * `.optional()`, so the Zod-derived JSON schema stays strict-mode compatible
 * for structured outputs. But that strictness is a contract with the MODEL,
 * not with rows written before those fields existed: in an older payload they
 * are ABSENT, and `.nullable()` rejects `undefined`. Parsing one then throws —
 * which is how a single legacy confirmation took out the whole /app inbox, and
 * Home with it, since the queue parses every row inside a `map()`.
 *
 * So on the read path the six required-but-nullable fields default to null when
 * missing. Output type is unchanged (still non-optional), so writers and every
 * consumer of `NoteExtraction` are unaffected.
 */
export const storedRelationshipSchema = relationshipSchema.extend({
  entity_type_hint: z.string().nullable().default(null),
  object_is_named: z.boolean().nullable().default(null),
  role_title: z.string().nullable().default(null),
  is_current: z.boolean().nullable().default(null),
  started_at: z.string().nullable().default(null),
  ended_at: z.string().nullable().default(null),
});

/** {@link noteExtractionSchema} for already-persisted payloads — see
 *  {@link storedRelationshipSchema} for why the read path is more forgiving. */
export const storedNoteExtractionSchema = noteExtractionSchema.extend({
  relationships: z.array(storedRelationshipSchema),
});

export type Fact = z.infer<typeof factSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type FollowUp = z.infer<typeof followUpSchema>;
export type NoteExtraction = z.infer<typeof noteExtractionSchema>;
