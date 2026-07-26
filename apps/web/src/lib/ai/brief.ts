import {
  BRIEF_SYSTEM,
  buildBriefPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { getContact } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { listContactEvents } from "@/lib/repo/events";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";
import { FeatureNotEntitledError, requireFeature } from "@/lib/entitlements";

export interface BriefResult {
  brief?: string;
  error?: string;
}

/** v1.2: the pre-meeting dossier, composed strictly from the user's graph. */
export async function generateBrief(
  userId: string,
  contactId: string,
): Promise<BriefResult> {
  if (!hasLLM()) {
    return { error: "Configure an LLM provider to generate briefs." };
  }
  // Load the whole graph context in ONE scoped connection. Without the
  // withUserDb scope, these five getDb()-acquiring reads (getContact + the
  // four-way Promise.all) each check out a separate tenant-pool connection in
  // this server-action context — five at once against a max-of-three pool,
  // which dead-locked on the connect timeout. The scope also releases the
  // connection before the LLM call below, so nothing is held across that
  // network round-trip (SCALING.md lever 2).
  const bundle = await withUserDb(userId, async () => {
    const detail = await getContact(contactId);
    if (!detail) return null;
    const [facts, notes, events, followUps] = await Promise.all([
      listFacts(contactId),
      listNotes(contactId),
      listContactEvents(contactId),
      listOpenFollowUps(contactId),
    ]);
    return { detail, facts, notes, events, followUps };
  });
  if (!bundle) return { error: "Contact not found." };
  const { detail, facts, notes, events, followUps } = bundle;

  try {
    // Pre-LLM DB work (entitlement + budget checks) in ONE short scope,
    // released BEFORE the LLM call so no tenant connection is held across that
    // multi-second Anthropic round-trip (GOAL 1b / SCALING.md lever 2). Left
    // unscoped, these getDb()-acquiring reads pin the request-scoped connection
    // until request end — i.e. across the whole LLM call, the pool-saturation
    // bug (#92).
    await withUserDb(userId, async () => {
      await requireFeature(userId, "pre_meeting_brief");
      await assertAiBudget(userId);
    });
    const lastTouch =
      detail.contact.lastReachedOutAt ?? detail.contact.createdAt;
    const result = await getLLMClient().complete({
      system: BRIEF_SYSTEM,
      prompt: buildBriefPrompt({
        contactName: detail.contact.name,
        title: detail.contact.title,
        company: detail.companyName,
        eventNames: events.map((event) => event.name),
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
    // Post-LLM metering write in its own short scope — again, no connection
    // held across the LLM call above.
    await withUserDb(userId, () =>
      recordAiAction("brief", result.model, result.usage),
    );
    const brief = result.data.trim();
    if (!brief) return { error: "The brief came back empty — try again." };
    return { brief };
  } catch (error) {
    if (error instanceof AiBudgetError) return { error: error.message };
    if (error instanceof FeatureNotEntitledError) {
      return { error: "Pre-meeting briefs require a Pro or Lifetime plan." };
    }
    return { error: "The AI call failed." };
  }
}
