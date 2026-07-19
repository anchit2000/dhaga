import {
  ENRICHMENT_SYSTEM,
  buildEnrichmentPrompt,
  getLLMClient,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { getContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { assertAiBudget, recordAiAction } from "./metering";

export interface EnrichmentFindings {
  noteId: string;
  contactName: string;
  text: string;
}

/**
 * User-triggered enrichment (BRD v1.1), step one: web-search the contact's
 * public footprint and save the cited findings as an enrichment note. Runs
 * inside the background worker (lib/jobs/extraction) — turning these findings
 * into facts is the worker's shared next step, so a saved note is never lost
 * behind a later extraction failure (the job errors, the note stays).
 *
 * Throws on budget/empty/not-found; the worker turns that into a retryable job
 * error. Feature-gating and the instant "requires Pro" message stay at enqueue
 * time in the action, so a non-entitled user never spawns a job at all.
 */
export async function runEnrichmentSearch(
  userId: string,
  contactId: string,
): Promise<EnrichmentFindings> {
  // Prep phase (DB): load the contact + budget check in a short scoped-db
  // lifetime, then release the connection BEFORE the long web-search call.
  const detail = await withUserDb(userId, async () => {
    const loaded = await getContact(contactId);
    if (!loaded) throw new Error("Contact not found.");
    await assertAiBudget(userId);
    return loaded;
  });

  // Search phase: no DB connection is held across this long web-search call.
  const result = await getLLMClient().complete({
    system: ENRICHMENT_SYSTEM,
    prompt: buildEnrichmentPrompt({
      name: detail.contact.name,
      title: detail.contact.title,
      company: detail.companyName,
      // getContact normalises methods to objects; the prompt wants bare URLs.
      links: detail.contact.links.map((link) => link.value),
    }),
    tier: "reason",
    maxTokens: 2048,
    webSearch: true,
  });

  const text = result.data.trim();
  if (!text) throw new Error("Enrichment returned nothing for this person.");

  // Save phase (DB): a fresh short-lived scope records usage + saves the note.
  return withUserDb(userId, async () => {
    await recordAiAction("enrichment", result.model, result.usage);
    const noteId = await addNote(contactId, "enrichment", text);
    return { noteId, contactName: detail.contact.name, text };
  });
}
