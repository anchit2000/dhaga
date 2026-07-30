import type { ExtractedContact } from "../schemas/contact";

/**
 * The receipt note for a card scan, composed in CODE from the extracted fields.
 *
 * The model used to return a verbatim transcription of the card alongside the
 * fields, and that string became the receipt. It was also the single biggest
 * cost in the scan: it roughly tripled the output tokens and took the round
 * trip from ~2.3s to ~6s — unusable when you are working a conference badge
 * queue. The fields themselves are the audit trail worth keeping, so the note
 * is now derived from them deterministically (project Rule 5: if code can
 * answer, code answers) and the photo remains the visual receipt.
 *
 * Trade-off, stated plainly: text printed on the card that maps to no field —
 * taglines, office addresses, other names — is no longer captured, so it is no
 * longer searchable. Restoring it means a second, off-the-critical-path
 * transcription call; see docs/TESTING.md §7c.
 */
export function cardReceiptText(contact: ExtractedContact): string {
  const role = [contact.title, contact.company].filter((part) => part?.trim()).join(" · ");
  const lines = [
    contact.name.trim(),
    role,
    ...contact.emails,
    ...contact.phones,
    ...contact.links,
    contact.location ?? "",
  ];
  const body = lines.map((line) => line.trim()).filter(Boolean).join("\n");
  return body ? `Scanned from a card:\n${body}` : "";
}
