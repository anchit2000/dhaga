import { hasLLM } from "@dhaga/core";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAiCreditsOverview } from "@/lib/repo/ai-usage";
import { AiCreditsSetting, AiCreditsUnavailable } from "@/components/app/settings/AiCredits";

/**
 * Data wrapper for the Credits tab. One call, one request-scoped connection —
 * `getAiCreditsOverview` does the aggregation in the repo layer rather than
 * fanning `getDb()` out across a card per number.
 *
 * Strictly the acting user's own usage: the query reads `ai_actions` through the
 * request-scoped (RLS-scoped, when hosted) connection and takes no user id from
 * the URL. The operator's instance-wide view is a different page entirely
 * (/app/admin/ai-credits).
 */
export async function CreditsSection() {
  const userId = await requireUserIdForPage();
  if (!hasLLM()) return <AiCreditsUnavailable />;
  return <AiCreditsSetting overview={await getAiCreditsOverview(userId)} />;
}
