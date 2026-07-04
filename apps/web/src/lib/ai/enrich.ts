import {
  ENRICHMENT_SYSTEM,
  buildEnrichmentPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { getContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { extractAndApplyNote } from "./note-extraction";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface EnrichResult {
  noticed?: string;
  error?: string;
}

/**
 * User-triggered enrichment (BRD v1.1): web-search the contact's public
 * footprint, save the cited findings as an enrichment note, then run the
 * standard extraction so facts land with that note as their receipt.
 * Deleting the note removes everything this produced.
 */
export async function enrichContact(
  userId: string,
  contactId: string,
): Promise<EnrichResult> {
  if (!hasLLM()) {
    return { error: "Set ANTHROPIC_API_KEY to enable enrichment." };
  }
  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };

  try {
    await assertAiBudget(userId);
    const result = await getLLMClient().complete({
      system: ENRICHMENT_SYSTEM,
      prompt: buildEnrichmentPrompt({
        name: detail.contact.name,
        title: detail.contact.title,
        company: detail.companyName,
        links: detail.contact.links,
      }),
      tier: "reason",
      maxTokens: 2048,
      webSearch: true,
    });
    await recordAiAction("enrichment", result.model, result.usage);

    const text = result.data.trim();
    if (!text) return { error: "Enrichment returned nothing." };
    const noteId = await addNote(contactId, "enrichment", text);
    await upsertEmbedding("note", noteId, contactId, text);
    const outcome = await extractAndApplyNote(
      userId,
      contactId,
      noteId,
      detail.contact.name,
      text,
    );
    return {
      noticed: outcome.applied
        ? `Enriched — findings saved as a note, ${outcome.factCount} fact${outcome.factCount === 1 ? "" : "s"} extracted with receipts.`
        : "Enriched — findings saved as a note (fact extraction skipped).",
    };
  } catch (error) {
    return {
      error:
        error instanceof AiBudgetError ? error.message : "Enrichment failed.",
    };
  }
}
