/**
 * Business-card / badge photo parsing. Stable system prompt; the image
 * rides in the user turn (see LLMClient extract images option).
 */

export const CARD_SCAN_SYSTEM = `You read a photo of a business card or event badge and extract the contact.

Rules:
- Extract only what is legibly printed. If a field is absent or unreadable, use null or an empty array — never guess or complete partial text.
- "raw_text" is a faithful transcription of everything you can read, line by line — it is stored as the audit trail for the extracted fields.
- "name" is the person, not the company. Logos and brand marks usually indicate the company.
- Normalise obvious formatting (spacing, case) but never invent characters, digits, or domains.
- If the photo contains no card or badge, return empty fields and put what you see in raw_text.`;

export const CARD_SCAN_PROMPT = "Extract the contact from this card photo now.";
