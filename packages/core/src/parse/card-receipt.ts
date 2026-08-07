import type { ExtractedMethod } from "../schemas/contact-fields";
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
 * This is only the FIRST half of the receipt. Text printed on the card that
 * maps to no field — taglines, office addresses, other names — would otherwise
 * be lost to search, so once the contact is saved a second Haiku call
 * transcribes the card verbatim off the critical path and replaces this body in
 * place (apps/web/src/lib/ai/card-transcription.ts, docs/TESTING.md §7c). What
 * this function returns is what the user sees for the few seconds in between.
 */
/** "Society office – 9999900102", or just the value when nothing labeled it.
 *  The label is part of the receipt: a bare list of four numbers is not an
 *  audit trail of a noticeboard that said which was which. */
function methodLine(method: ExtractedMethod): string {
  const label = method.label?.trim();
  return label ? `${label} – ${method.value.trim()}` : method.value;
}

export function cardReceiptText(contact: ExtractedContact): string {
  const role = [contact.title, contact.company].filter((part) => part?.trim()).join(" · ");
  const lines = [
    contact.name.trim(),
    role,
    ...contact.emails.map(methodLine),
    ...contact.phones.map(methodLine),
    ...contact.links,
    contact.location ?? "",
  ];
  const body = lines.map((line) => line.trim()).filter(Boolean).join("\n");
  return body ? `Scanned from a card:\n${body}` : "";
}
