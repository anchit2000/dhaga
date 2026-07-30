import { z } from "zod";
import { extractedContactSchema } from "./contact";

/**
 * Card/badge photo → contact (M1's server-side vision path, BRD §6.1).
 *
 * Fields only. This used to also ask for `raw_text`, a verbatim transcription
 * of the card, which cost more output tokens than every field combined and put
 * the scan at ~6s. The receipt note is now composed from these fields by
 * {@link cardReceiptText} instead — see that function for the trade-off.
 */
export const cardScanSchema = extractedContactSchema;

export type CardScan = z.infer<typeof cardScanSchema>;
