/**
 * Optional --with-notes pass: 1-3 short templated notes for ~20% of contacts
 * and 0-2 facts each, every fact carrying a source_note_id receipt. Hardcoded
 * template text only — the seeder never calls an LLM.
 */
import { FACT_TEMPLATES, NOTE_DETAILS, NOTE_DETAILS_2, NOTE_TEMPLATES } from "./data.mjs";

export function buildNotes(ctx) {
  for (const contact of ctx.contacts) {
    if (ctx.staleIds.has(contact.id) || !ctx.rng.chance(0.2)) continue;
    const noteIds = [];
    const noteCount = ctx.rng.int(1, 3);
    for (let i = 0; i < noteCount; i++) {
      const body = ctx.rng
        .pick(NOTE_TEMPLATES)
        .replace("{name}", contact.name.split(" ")[0])
        .replace("{context}", contact.tags[0] ? contact.tags[0].replaceAll("-", " ") : "a meetup")
        .replace("{detail}", ctx.rng.pick(NOTE_DETAILS))
        .replace("{detail2}", ctx.rng.pick(NOTE_DETAILS_2));
      const id = ctx.rng.uuid();
      noteIds.push(id);
      ctx.notes.push({ id, contactId: contact.id, kind: "text", body });
    }
    const factCount = ctx.rng.int(0, 2);
    for (let i = 0; i < factCount; i++) {
      const [type, template] = ctx.rng.pick(FACT_TEMPLATES);
      ctx.facts.push({
        id: ctx.rng.uuid(),
        contactId: contact.id,
        type,
        text: template
          .replace("{title}", contact.title ?? "an operator")
          .replace("{city}", contact.location ?? "town"),
        confidence: Math.round((0.7 + ctx.rng.float() * 0.28) * 100) / 100,
        sourceNoteId: ctx.rng.pick(noteIds),
      });
    }
  }
}
