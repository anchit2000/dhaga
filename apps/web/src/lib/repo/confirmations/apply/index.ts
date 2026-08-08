import { type ConfirmationPayload } from "@dhaga/core";
import { scheduleCalendarWriteOutForCurrentUserNote } from "@/lib/calendar/write-out";
import { verifyFact } from "../../notes";
import { applyExtraction } from "../../graph/apply-extraction";
import { userToday } from "../../reminders/local-today";
import { applyFollowUpDate } from "../apply-follow-up-date";
import { applyEntityLink, applyNoteSubject, applySubjectResolution } from "./writers";
import type { ConfirmationChoice, ConfirmationResult } from "./types";

export type { ConfirmationChoice, ConfirmationResult, NoteSubjectChoice } from "./types";

/**
 * Run the deterministic action a confirmation proposed. The KG is mutated ONLY
 * here (never by the AI writer), reusing the same primitives edge_suggestions
 * and extraction already use — resolveTarget, verifyFact, applyExtraction.
 */
export async function applyConfirmation(
  payload: ConfirmationPayload,
  sourceNoteId: string | null,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  switch (payload.type) {
    case "entity_link":
      return applyEntityLink(payload, sourceNoteId, choice);
    case "subject_resolution":
      return applySubjectResolution(payload, sourceNoteId, choice);
    case "note_subject":
      return applyNoteSubject(payload, choice);
    case "follow_up_date":
      return applyFollowUpDate(
        payload,
        choice && "followUpDate" in choice ? choice : undefined,
      );
    case "enrichment_match":
      await verifyFact(payload.apply.factId);
      return { kind: "fact", factId: payload.apply.factId };
    case "supplement":
      if (!sourceNoteId) {
        throw new Error("supplement confirmation needs a source note receipt");
      }
      const today = await userToday();
      await applyExtraction(payload.apply.contactId, sourceNoteId, payload.apply.extraction, {
        today,
      });
      // A confirmed supplement writes follow-ups through exactly the same
      // applyExtraction the capture path uses, so they have to reach a
      // write-enabled calendar the same way (lib/ai/note-extraction schedules
      // this for the note it just extracted). Registers after() work only: the
      // sync runs post-response in its own short DB scopes, so this mutation's
      // tenant connection is never held across the Google/Microsoft call.
      await scheduleCalendarWriteOutForCurrentUserNote(sourceNoteId);
      return { kind: "extraction", contactId: payload.apply.contactId };
  }
}
