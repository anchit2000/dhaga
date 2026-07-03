import {
  BRIEF_SYSTEM,
  buildBriefPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { getContact } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { listContactSessions } from "@/lib/repo/sessions";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface BriefResult {
  brief?: string;
  error?: string;
}

/** v1.2: the pre-meeting dossier, composed strictly from the user's graph. */
export async function generateBrief(contactId: string): Promise<BriefResult> {
  if (!hasLLM()) {
    return { error: "Set ANTHROPIC_API_KEY to generate briefs." };
  }
  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };
  const [facts, notes, sessions, followUps] = await Promise.all([
    listFacts(contactId),
    listNotes(contactId),
    listContactSessions(contactId),
    listOpenFollowUps(contactId),
  ]);

  try {
    await assertAiBudget();
    const lastTouch =
      detail.contact.lastReachedOutAt ?? detail.contact.createdAt;
    const result = await getLLMClient().complete({
      system: BRIEF_SYSTEM,
      prompt: buildBriefPrompt({
        contactName: detail.contact.name,
        title: detail.contact.title,
        company: detail.companyName,
        sessionNames: sessions.map((session) => session.name),
        facts: facts.slice(0, 12).map((fact) => fact.text),
        noteSnippets: notes
          .slice(0, 5)
          .map((note) =>
            note.body.length > 240 ? `${note.body.slice(0, 240)}…` : note.body,
          ),
        openFollowUps: followUps.map((followUp) => followUp.action),
        lastTouch: lastTouch.toDateString(),
      }),
      tier: "reason",
    });
    await recordAiAction("brief", result.model, result.usage);
    return { brief: result.data.trim() };
  } catch (error) {
    return {
      error:
        error instanceof AiBudgetError ? error.message : "The AI call failed.",
    };
  }
}
