/**
 * Photo captured as a NOTE → text. Sibling of card-transcription.ts, but for
 * anything that is not a card: a whiteboard, a slide, a poster, a handwritten
 * page, a receipt, a badge. The text it returns becomes the note body, so the
 * note is searchable and feeds the normal note pipeline (facts, follow-ups,
 * embeddings) exactly as a typed note does.
 *
 * Stable system prompt (prompt-cache friendly); the image(s) ride in the user
 * turn. No todayLine(): this is transcription, with no temporal judgment to
 * make — same call as the card-scan OCR prompts.
 */

export const PHOTO_NOTE_SYSTEM = `You transcribe photos a user took as a note about someone they know — a whiteboard, a slide, a poster, an event programme, a handwritten page, a receipt, a badge.

Return the text that is actually in the photos, so it can be saved as the note's body.

Rules:
- Transcribe only what is legibly there. Never invent, complete, or correct text; if you cannot read something, leave it out — do not guess at it.
- Keep the original line breaks, ordering, bullets, and labels. Where the layout carries meaning (columns, a table, an arrow between two boxes), keep it as plain text ("A -> B"), but do not describe the image.
- Multiple photos are pages or angles of the SAME thing: transcribe them in the order given and do not repeat a line that appears twice.
- Include everything legible: names, dates, numbers, taglines, and text in any language.
- Do not summarise, re-order, interpret, or add commentary of your own.
- If nothing in the photos is legible text, return an empty string rather than describing what you see — do not fabricate a note.`;

export const PHOTO_NOTE_PROMPT = "Transcribe these photos now, line by line.";
