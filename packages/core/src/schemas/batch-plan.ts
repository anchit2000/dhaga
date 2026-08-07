import { z } from "zod";
import { extractedContactSchema } from "./contact";

/**
 * The plan a whole messaging batch is turned into, in ONE structured output.
 *
 * Why a batch-level plan at all: the previous walk processed a forwarded batch
 * one message at a time, each with its own extraction call and a "current
 * contact" cursor carried between them. No call ever saw more than one message,
 * so a batch like
 *
 *   1. "Priya Raman is the founder of Lumen Labs …"
 *   2. "Create a new contact"
 *
 * could not relate (2) to (1): message 1 raised an ambiguity and set no cursor,
 * so message 2 arrived with nothing to attach to and created a contact named
 * "Unnamed contact". Planning over the WHOLE batch removes the cursor, the
 * positional assumption, and that entire class of failure — the model sees both
 * messages together and reads the second as a directive about the first.
 *
 * The model only PLANS. Every write is deterministic code applying this shape
 * (CLAUDE.md Rule 5: the model is for judgment, code does the transforms), which
 * is the same split confirmations/apply.ts already uses for the KG.
 *
 * Structured-outputs note: required-but-nullable (never .optional()) so the
 * Zod-derived JSON schema stays strict-mode compatible — mirrors schemas/contact.
 */

/** One note to store, with the message positions it was derived from. The seqs
 *  are the RECEIPT: every stored note can be traced to the messages that
 *  produced it, and a message referenced nowhere in the plan is reported rather
 *  than dropped (CLAUDE.md Rule 12). */
const plannedNoteSchema = z.object({
  body: z
    .string()
    .describe(
      "The note to store — the user's own words, lightly cleaned and joined into readable prose. Never invented, never summarised away. Do NOT include directives addressed to the assistant.",
    ),
  sourceItemSeqs: z
    .array(z.number().int())
    .describe(
      "The seq numbers of every message this note was built from, including any directive message that only told you what to do with it.",
    ),
});

/** A person the batch is about, and everything in the batch that belongs to them. */
const plannedPersonSchema = z.object({
  existingContactId: z
    .string()
    .nullable()
    .describe(
      "The id of an existing contact from the candidate list when this is confidently that same person; null when they should be created. Only use an id that appears in the candidates — never invent one.",
    ),
  contact: extractedContactSchema.describe(
    "The person's details as stated anywhere in the batch. For an existing contact, include only what the batch actually says — absent fields stay null/empty and nothing is overwritten by guesswork.",
  ),
  sourceItemSeqs: z
    .array(z.number().int())
    .describe(
      "The seq numbers of every message that contributed to this person — including ones that carried only contact details (a shared contact card, a signature block) and produced no note.",
    ),
  notes: z
    .array(plannedNoteSchema)
    .describe(
      "Notes to file on this person, in the order they were captured. Empty when the batch carried only contact details for them and nothing worth writing down.",
    ),
});

/** A note the batch could not confidently attribute — raised for the user to
 *  resolve in the app, never guessed at and never asked about in chat. */
const unclearNoteSchema = z.object({
  subjectName: z
    .string()
    .nullable()
    .describe("The name as written in the message, when there was one; null when the note named nobody."),
  noteBody: z
    .string()
    .describe("The note text to hold until the user says who it is about. Nothing is stored on anybody until then."),
  candidateContactIds: z
    .array(z.string())
    .describe(
      "Ids from the candidate list that this note might plausibly be about — the options the user will pick between. Empty when none of them fit.",
    ),
  sourceItemSeqs: z.array(z.number().int()).describe("The seq numbers of the messages this note came from."),
});

export const batchPlanSchema = z.object({
  people: z
    .array(plannedPersonSchema)
    .describe(
      "Every distinct person this batch is about. One entry per person even when several messages describe them; several entries when the batch spans several people.",
    ),
  unclear: z
    .array(unclearNoteSchema)
    .describe(
      "Notes you could not confidently attribute. Use this ONLY for genuine ambiguity — a bare first name matching several known people. A full name that merely shares a first name with existing contacts is a NEW person and belongs in `people`.",
    ),
});

export type BatchPlan = z.infer<typeof batchPlanSchema>;
export type PlannedPerson = z.infer<typeof plannedPersonSchema>;
export type PlannedNote = z.infer<typeof plannedNoteSchema>;
export type UnclearNote = z.infer<typeof unclearNoteSchema>;

/** An empty plan — what a batch with nothing to act on produces. */
export function emptyBatchPlan(): BatchPlan {
  return { people: [], unclear: [] };
}

/**
 * Every message seq the plan accounts for. The caller diffs this against the
 * seqs it actually sent: anything missing was silently dropped by the model and
 * must be surfaced to the sender rather than vanishing (CLAUDE.md Rule 12).
 */
export function plannedItemSeqs(plan: BatchPlan): Set<number> {
  const seqs = new Set<number>();
  for (const person of plan.people) {
    for (const seq of person.sourceItemSeqs) seqs.add(seq);
    for (const note of person.notes) {
      for (const seq of note.sourceItemSeqs) seqs.add(seq);
    }
  }
  for (const note of plan.unclear) {
    for (const seq of note.sourceItemSeqs) seqs.add(seq);
  }
  return seqs;
}
