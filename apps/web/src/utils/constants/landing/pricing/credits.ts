/**
 * What one AI credit buys, in the words a first-time visitor would use.
 *
 * The prices restate `AI_ACTION_CREDITS` (`packages/core/src/metering/credits.ts`),
 * which is canonical — this is a client-safe mirror in the same spirit as
 * `@/utils/constants/facts`, because the landing bundle must not pull the core
 * LLM module in for four numbers. If a credit price moves there, it moves here,
 * and the plan sizing in ./plans.ts and the answers in ./faq.ts move with it.
 *
 * Grouped by price, not by feature: everything that costs 1 sits on one line,
 * so a layman reads four numbers instead of eight.
 */
export const CREDIT_EXAMPLES = [
  {
    price: "1 credit",
    action:
      "Scan a card or badge, paste an email signature, turn a note into facts, or draft a follow-up",
  },
  { price: "2 credits", action: "Ask your network a question, or get a pre-meeting brief" },
  { price: "20 credits", action: "Deep research on a person or company, from the live web" },
  { price: "Free", action: "The nightly job-change and news watch on contacts you follow" },
] as const;
