import {
  DRAFT_SYSTEM,
  buildDraftPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { getContact } from "@/lib/repo/contacts";
import { listFacts, listNotes } from "@/lib/repo/notes";
import { listContactSessions } from "@/lib/repo/sessions";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface DraftResult {
  draft?: string;
  error?: string;
}

/** M7: one-tap personalized follow-up draft from the contact's context. */
export async function generateFollowUpDraft(
  userId: string,
  contactId: string,
): Promise<DraftResult> {
  if (!hasLLM()) {
    return { error: "Set ANTHROPIC_API_KEY to generate follow-up drafts." };
  }
  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };
  const [contactFacts, contactNotes, contactSessions] = await Promise.all([
    listFacts(contactId),
    listNotes(contactId),
    listContactSessions(contactId),
  ]);

  try {
    await assertAiBudget(userId);
    const result = await getLLMClient().complete({
      system: DRAFT_SYSTEM,
      prompt: buildDraftPrompt({
        contactName: detail.contact.name,
        title: detail.contact.title,
        company: detail.companyName,
        sessionNames: contactSessions.map((session) => session.name),
        facts: contactFacts.slice(0, 10).map((fact) => fact.text),
        noteSnippets: contactNotes
          .slice(0, 5)
          .map((note) =>
            note.body.length > 240 ? `${note.body.slice(0, 240)}…` : note.body,
          ),
      }),
      tier: "reason",
    });
    await recordAiAction("draft", result.model, result.usage);
    const draft = result.data.trim();
    if (!draft) return { error: "The draft came back empty — try again." };
    return { draft };
  } catch (error) {
    return {
      error:
        error instanceof AiBudgetError ? error.message : "The AI call failed.",
    };
  }
}
