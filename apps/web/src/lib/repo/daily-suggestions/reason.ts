import { CADENCE_OPTIONS } from "@/utils/constants/app";
import {
  SUGGESTION_REASON_TERMS,
  SUGGESTION_SIGNAL_HEADLINE_MAX,
} from "@/utils/constants/suggestions";
import { followUpDueBadge } from "@/utils/follow-up-due";
import { formatDate } from "@/utils/format-date";
import { upcomingDateBadge } from "@/utils/upcoming-date";
import type { ScoredCandidate } from "./score";
import type { ScoredTerm, SuggestionBucket, SuggestionCandidate } from "./types";

/**
 * Turns the winning scoring term into the row's bucket and its one-line reason.
 * PURE. The winner is the reason-ELIGIBLE term with the most points, so the copy
 * is derived from the same numbers that ranked the person — a row can never be
 * labelled by something that didn't put it there. `starred` and `rotation` are
 * excluded outright: "you starred them" is not a thing to do today, and this
 * string is emailed verbatim.
 *
 * SECURITY: signal headlines and follow-up actions are LLM-derived free text, so
 * `reason` is only ever rendered in a TEXT NODE (TodaySuggestions.tsx, and
 * lib/email/daily-digest.ts whose escapeHtml covers `& < >` only). Do not move
 * it into an HTML attribute.
 */

export interface SuggestionCopy {
  bucket: SuggestionBucket;
  reason: string;
}

type ReasonTermId = (typeof SUGGESTION_REASON_TERMS)[number];

function cadenceLabel(everyDays: number): string {
  return CADENCE_OPTIONS.find((option) => option.days === everyDays)?.label ?? `Every ${everyDays}d`;
}

function cadenceCopy(candidate: SuggestionCandidate): SuggestionCopy | null {
  if (candidate.everyDays === null) return null;
  if (candidate.everyDays <= 1) return { bucket: "daily", reason: "Daily check-in" };
  return { bucket: "cadence", reason: `${cadenceLabel(candidate.everyDays)} · due to reconnect` };
}

function followUpCopy(candidate: SuggestionCandidate, todayMs: number): SuggestionCopy | null {
  if (!candidate.followUp) return null;
  const badge = followUpDueBadge(candidate.followUp, new Date(todayMs));
  return { bucket: "follow-up", reason: `Follow-up ${badge.label}` };
}

function importantDateCopy(candidate: SuggestionCandidate): SuggestionCopy | null {
  const date = candidate.importantDate;
  if (!date) return null;
  return { bucket: "date", reason: `${date.label} ${upcomingDateBadge(date.daysUntil).label}` };
}

function signalCopy(candidate: SuggestionCandidate): SuggestionCopy | null {
  const headline = candidate.signal?.headline;
  if (!headline) return null;
  const reason =
    headline.length <= SUGGESTION_SIGNAL_HEADLINE_MAX
      ? headline
      : `${headline.slice(0, SUGGESTION_SIGNAL_HEADLINE_MAX - 1).trimEnd()}…`;
  return { bucket: "signal", reason };
}

function quietCopy(candidate: SuggestionCandidate): SuggestionCopy {
  return { bucket: "quiet", reason: `No contact since ${formatDate(candidate.lastTouch)}` };
}

function degreeCopy(candidate: SuggestionCandidate): SuggestionCopy {
  const s = candidate.degree === 1 ? "" : "s";
  return { bucket: "graph", reason: `${candidate.degree} connection${s} in your network` };
}

const COPY: Record<
  ReasonTermId,
  (candidate: SuggestionCandidate, todayMs: number) => SuggestionCopy | null
> = {
  cadence: cadenceCopy,
  followUp: followUpCopy,
  importantDate: importantDateCopy,
  signal: signalCopy,
  quiet: quietCopy,
  degree: degreeCopy,
};

/** Most points wins; `>` keeps the earlier entry on a tie, so ties fall back to
 *  SUGGESTION_REASON_TERMS' declaration order. Null when nothing scored. */
function winningTerm(terms: ScoredTerm[]): ReasonTermId | null {
  let best: ReasonTermId | null = null;
  let bestPoints = 0;
  for (const id of SUGGESTION_REASON_TERMS) {
    const points = terms.find((term) => term.id === id)?.points ?? 0;
    if (points > bestPoints) {
      best = id;
      bestPoints = points;
    }
  }
  return best;
}

/** Falls back to the quiet copy when no term scored (or the winning term's
 *  evidence is gone) — it is the one reason that is true of everybody. */
export function describeSuggestion(scored: ScoredCandidate, todayMs: number): SuggestionCopy {
  const winner = winningTerm(scored.terms);
  const copy = winner ? COPY[winner](scored.candidate, todayMs) : null;
  return copy ?? quietCopy(scored.candidate);
}
