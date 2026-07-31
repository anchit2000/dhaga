/**
 * Copy + link target for the PRE-CLICK "no AI credits left" state — the UX layer
 * over `assertAiBudget` (lib/ai/metering), never a replacement for it. The
 * server refusal is unchanged; these strings exist so a user learns *before*
 * clicking that the action cannot run, and what to do about it.
 *
 * Two cases, because "you never had cloud AI" and "you spent this month's
 * credits" need different advice — only the second one resets on its own.
 */

/** Cap is 0 — no allowance at all, so waiting changes nothing. Same sentence
 *  `aiUsageLabel` already shows for this case, so the usage line and the greyed
 *  control never say two different things. */
export const AI_GATE_PAID_FEATURE_REASON =
  "No monthly AI credits on this plan — upgrade to enable AI actions.";

/**
 * Cap is positive but spent. Credits are counted per calendar month
 * (`aiCreditsUsedThisMonth`), so waiting is a real way out — say so, rather than
 * making upgrading look like the only option. Opens on the same phrasing the
 * saved-note notice uses ("You're out of AI credits this month").
 */
export function aiGateExhaustedReason(cap: number): string {
  return `You're out of AI credits this month — all ${cap} used. They reset on the 1st.`;
}

/** Where the notice sends someone for the detail: the Credits tab, which shows
 *  what is left, what each action costs and where the rest went. */
export const AI_GATE_DETAIL_HREF = "/app/settings#credits";
