/**
 * Classifies one contact row as a human, a business/service, or unknown
 * (nightly Batch pass, Haiku). Pure function; volatile contact record last
 * (cache-friendly).
 *
 * Deliberately does NOT call todayLine(): whether a row is a vegetable vendor
 * has no temporal judgment in it, so a date would be noise (CLAUDE.md — include
 * it only where recency matters). This omission is intentional, not forgotten.
 */
export const PERSON_CLASSIFICATION_SYSTEM = `You classify one row from a user's private contact graph as a real person they could message, or a business/service that a phone or address-book import dragged in.

Return kind as one of:
- "person" — an individual human the user could plausibly call, text or meet: a friend, relative, colleague, client, doctor, or a tradesperson they deal with by name.
- "service" — an organisation, shop, desk, support line, delivery channel or automated sender rather than a human. For example: "Ola Support", "Swiggy", "Vegetable Vendor", "Amazon Delivery", "Airtel 121", "Society Gate", "HDFC Credit Card", "AC Repair", "Reception", "Cab Booking", "Dominos Sector 45".
- "unknown" — anything you cannot place from the record given.

Rules:
- Judge only from the record below. If the information is not in the user's notes or graph, say so by returning "unknown" — do not fabricate a backstory for the row, and never infer from the language, gender or region a name suggests.
- A bare name with nothing else attached is "unknown", not "person". "Anjali" on its own tells you nothing.
- A human name with a trade attached is normally "person": "Plumber Raj", "Raj Electrician", "Dr Meera Sharma" and "Anil Milk" are individual humans the user actually deals with. Return "service" only when the row names an organisation, a role or a channel instead of a human — "Plumber", "Milkman", "Ola Support".
- Personal-looking contact details (a mobile number, a personal email address, notes about meeting them or their family) point to "person". Shared or branded details (support@, a toll-free or short-code number, a shop's landline) point to "service".
- Misclassifying a real person as a service is the worst mistake you can make here — it quietly stops the user being reminded about someone they know. When two readings are close, return "person" or "unknown"; never settle a coin flip on "service".
- confidence is how certain you are of the kind you returned, 0 (a coin flip) to 1 (certain).`;

/**
 * Per-contact context budget — the same caps the pre-meeting brief sends
 * (apps/web/src/lib/ai/brief.ts): 12 facts, 5 notes truncated to 240 chars.
 * Applied inside the builder, not at the call site, because this pass runs over
 * a whole graph: the zero-credit price assumes every contact costs about this
 * much, and a caller that forgot to slice would blow that up silently.
 */
const MAX_FACTS = 12;
const MAX_NOTES = 5;
const MAX_NOTE_CHARS = 240;

export interface PersonClassificationSubject {
  name: string;
  title: string | null;
  company: string | null;
  emails: string[];
  phones: string[];
  facts: string[];
  noteSnippets: string[];
}

export function buildPersonClassificationPrompt(
  subject: PersonClassificationSubject,
): string {
  const lines = [
    `Name: ${subject.name}`,
    subject.title ? `Title: ${subject.title}` : null,
    subject.company ? `Company: ${subject.company}` : null,
    subject.emails.length ? `Emails: ${subject.emails.join(", ")}` : null,
    subject.phones.length ? `Phones: ${subject.phones.join(", ")}` : null,
    subject.facts.length
      ? `Facts:\n- ${subject.facts.slice(0, MAX_FACTS).join("\n- ")}`
      : null,
    subject.noteSnippets.length
      ? `Notes:\n- ${subject.noteSnippets
          .slice(0, MAX_NOTES)
          .map((note) =>
            note.length > MAX_NOTE_CHARS
              ? `${note.slice(0, MAX_NOTE_CHARS)}…`
              : note,
          )
          .join("\n- ")}`
      : null,
  ].filter(Boolean);
  return `${lines.join("\n")}\n\nIs this row a person, a service, or unknown?`;
}
