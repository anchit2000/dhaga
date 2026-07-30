import { EXTRACTION_BLOCKED_LABEL } from "@/utils/constants/extraction-jobs";
import type { NotificationType } from "@/utils/constants/notifications";
import type { ExtractionJobKind } from "@/types";

/**
 * Copy builders for extraction-job notifications. PURE functions (no DB, no
 * logging) so the wording and the pluralisation are unit-testable without a
 * database — the whole point of the notification is that a user who navigated
 * away can read what actually happened, so vague copy defeats it.
 */

/** The terminal outcomes worth telling the user about, straight from the worker. */
export type JobOutcome =
  | { status: "done"; kind: ExtractionJobKind; factCount: number; followUpCount: number }
  | { status: "error"; kind: ExtractionJobKind; message: string }
  | { status: "blocked"; kind: ExtractionJobKind };

export interface JobNotificationCopy {
  type: NotificationType;
  title: string;
  body: string | null;
}

/** Used when the subject contact's name can't be resolved (deleted mid-run). */
const UNKNOWN_SUBJECT = "a contact";

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * "4 facts and 1 follow-up" / "1 fact" / "2 follow-ups", or null when the run
 * produced nothing — the caller words that case differently rather than saying
 * "extracted 0 facts".
 */
export function countPhrase(factCount: number, followUpCount: number): string | null {
  const parts: string[] = [];
  if (factCount > 0) parts.push(plural(factCount, "fact", "facts"));
  if (followUpCount > 0) parts.push(plural(followUpCount, "follow-up", "follow-ups"));
  if (parts.length === 0) return null;
  return parts.join(" and ");
}

export function buildJobNotification(
  outcome: JobOutcome,
  contactName: string | null,
): JobNotificationCopy {
  const name = contactName?.trim() || UNKNOWN_SUBJECT;

  if (outcome.status === "blocked") {
    // Reuses the ONE existing blocked-job string (constants/extraction-jobs)
    // rather than growing a second wording of the same paid-feature notice.
    // The subject is carried by the row's contact, not repeated in the copy.
    return { type: "job_blocked", title: EXTRACTION_BLOCKED_LABEL, body: null };
  }

  if (outcome.status === "error") {
    return {
      type: "job_failed",
      title:
        outcome.kind === "enrichment"
          ? `Web enrichment failed for ${name}`
          : `Extraction failed for ${name}`,
      // The row links to the person page, which is where the Retry lives — so
      // the message is the "why", not the "what now".
      body: outcome.message,
    };
  }

  const phrase = countPhrase(outcome.factCount, outcome.followUpCount);
  if (outcome.kind === "enrichment") {
    return {
      type: "job_done",
      title: `Web enrichment finished for ${name}`,
      body: phrase ? `Extracted ${phrase} to review.` : "Nothing new found.",
    };
  }
  return {
    type: "job_done",
    title: phrase
      ? `Extracted ${phrase} from your note about ${name}`
      : `No new facts in your note about ${name}`,
    body: null,
  };
}
