import { z } from "zod";
import { extractedContactSchema } from "./contact";

/**
 * Card/badge photo → contact (M1's server-side vision path, BRD §6.1).
 * raw_text is the model's transcription of everything legible on the card —
 * it becomes the capture receipt note, exactly like pasted text does.
 */
export const cardScanSchema = extractedContactSchema.extend({
  raw_text: z
    .string()
    .describe(
      "Combined verbatim transcription of all legible text across every provided photo (which may be several views of the same card/leaflet, e.g. front and back)",
    ),
});

export type CardScan = z.infer<typeof cardScanSchema>;
