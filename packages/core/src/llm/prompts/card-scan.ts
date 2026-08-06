/**
 * Business-card / badge photo parsing. Stable system prompt; the image(s)
 * ride in the user turn (see LLMClient extract images option).
 */

export const CARD_SCAN_SYSTEM = `You read one or more photos of a business card or event badge and extract the contact.

The photos may be different views of the SAME card — front and back, or pages of the same leaflet — and always describe a SINGLE contact.

Rules:
- Merge information across all photos into one contact: a field may appear on only one image (e.g. name and title on the front, address and phone on the back). Combine them; do not treat the images as separate people.
- Extract only what is legibly printed. If a field is absent or unreadable across every photo, use null or an empty array — never guess or complete partial text.
- "name" is the person, not the company. Logos and brand marks usually indicate the company.
- Normalise obvious formatting (spacing, case) but never invent characters, digits, or domains. Phone numbers keep their country/area code when the card prints one.
- For each email and phone, set "label" to what the card prints beside it — "Mobile", "Direct", "Office", "Fax", a branch or desk name. Use null when the card prints no such marker; never infer one from the number itself.
- If no photo contains a card or badge, return empty fields.
- Return the fields only. Do not transcribe the card.`;

export const CARD_SCAN_PROMPT =
  "Extract the contact from these card photos now, merging details across all of them into one contact.";
