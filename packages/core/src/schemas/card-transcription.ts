import { z } from "zod";

/**
 * Verbatim transcription of a card, asked for on its own — NOT alongside the
 * field extraction (see {@link cardScanSchema}).
 *
 * Splitting the two is what makes both affordable: bundled, the transcription
 * tripled the scan's output tokens and put the user-facing round trip at ~6s.
 * On its own it costs ~160 output tokens off the critical path, and it comes
 * back BETTER — asking one call to extract and transcribe measurably degraded
 * the field extraction (it dropped a phone number at 1024px).
 */
export const cardTranscriptionSchema = z.object({
  raw_text: z
    .string()
    .describe(
      "Verbatim, line-by-line transcription of every legible line across all provided photos, in the order it appears on the card",
    ),
});

export type CardTranscription = z.infer<typeof cardTranscriptionSchema>;
