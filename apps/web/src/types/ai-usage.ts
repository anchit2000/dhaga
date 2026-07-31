/**
 * What the user's own AI-credits page reads. Distinct from `./ai-budget`, which
 * is the OPERATOR's view (instance-wide levers): nothing here crosses a user
 * boundary — every number is derived from the acting user's own `ai_actions`
 * rows and the ceiling that applies to them.
 */

/** One action TYPE's share of the month: how many the user did, and what that
 *  cost. `credits` is `count × the action's price`, so the rows sum to the
 *  month's total by construction. */
export interface AiCreditBreakdownRow {
  feature: string;
  /** Plural, user-facing ("Card scans"). Never the stored feature id. */
  label: string;
  count: number;
  credits: number;
  /** This action costs 0 credits (today: watchlist scans). Shown rather than
   *  hidden — a user whose watchlist ran all month must be able to see that it
   *  ran and that it was free, or the missing rows read as a bug. */
  free: boolean;
}

/** One past action, for the bounded activity list. */
export interface AiCreditActivityRow {
  id: string;
  /** Singular, user-facing ("Card scan"). */
  label: string;
  credits: number;
  free: boolean;
  at: Date;
}

/** The month's allowance, decomposed so a bigger-than-expected number is
 *  explainable rather than mysterious. */
export interface AiCreditAllowance {
  used: number;
  /** The ceiling actually enforced (base + grants). Meaningless when `unlimited`. */
  cap: number;
  remaining: number;
  unlimited: boolean;
  /** The winning ceiling before grants are added on top. */
  base: number;
  /** Active make-good grants, added to `base` to reach `cap`. */
  granted: number;
  /** Credits of an instance-wide promotion, when the promotion is what set
   *  `base`. Null when none is running or another rung won. */
  promotionCredits: number | null;
  /** When the month's counter rolls over (first instant of the next UTC month —
   *  the same boundary the metering layer counts from). */
  resetsAt: Date;
}

/** Everything the credits page renders, from one scoped connection. */
export interface AiCreditsOverview {
  allowance: AiCreditAllowance;
  breakdown: AiCreditBreakdownRow[];
  /** Credits spent this month. Equals the sum of `breakdown[].credits` and the
   *  figure the cap is enforced against. */
  totalCredits: number;
  totalActions: number;
  recent: AiCreditActivityRow[];
}
