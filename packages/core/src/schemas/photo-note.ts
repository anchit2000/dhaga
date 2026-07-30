import { z } from "zod";

/**
 * A photo captured AS a note — a whiteboard, a poster, a handwritten page, a
 * receipt, a badge someone showed you. The photo is the receipt; this is the
 * text that makes it a note.
 *
 * Deliberately the SAME single-string shape as {@link cardTranscriptionSchema}
 * rather than a fielded extraction: a card scan knows it is looking at a card
 * and can safely ask for name/title/phone, but a note photo could be anything,
 * so asking the model for structure here would invent facts the photo cannot
 * support. Structure is the job of the normal note pipeline, which runs on this
 * text afterwards exactly as it does on a typed note.
 *
 * `text` comes back empty when nothing was legible — that is a real outcome
 * (a blurry photo, a picture of a landscape), not a failure, and callers treat
 * it as "no transcription" rather than an error.
 */
export const photoNoteSchema = z.object({
  text: z
    .string()
    .describe(
      "Verbatim transcription of every legible line across all provided photos, in reading order, preserving the original line breaks and grouping. Empty string if nothing is legible.",
    ),
});

export type PhotoNote = z.infer<typeof photoNoteSchema>;
