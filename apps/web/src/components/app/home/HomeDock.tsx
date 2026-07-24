import { hasLLM } from "@dhaga/core";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { activeEventId } from "@/lib/active-event";
import { aiActionsUsedThisMonth, aiUsageLabel, monthlyAiCap } from "@/lib/ai/metering";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { getBillingGate } from "@/lib/hosted/gate";
import { listEvents } from "@/lib/repo/events";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { ReactElement } from "react";

/**
 * Home's bottom capture dock. Its own Suspense boundary: every query here is
 * fast (no calendar / suggestions chain), so it paints without waiting on the
 * dashboard's slow serial chain. The AI-usage line routes through aiUsageLabel
 * so free-tier users (cap 0) see "cloud AI is a paid feature", not "0 of 0 used".
 */
export async function HomeDock({ userId }: { userId: string }): Promise<ReactElement> {
  const [events, appConfig, used, unlimited] = await Promise.all([
    listEvents(HOME_PREVIEW_LIMIT),
    getCachedAppConfig(userId),
    hasLLM() ? aiActionsUsedThisMonth() : Promise.resolve(0),
    hasLLM() ? getBillingGate().then((gate) => gate.hasUnlimitedAi(userId)) : Promise.resolve(false),
  ]);
  const usageLabel = hasLLM() ? aiUsageLabel({ used, cap: monthlyAiCap(), unlimited }) : null;

  return (
    <QuickAddForm
      events={events.map(({ id, name }) => ({ id, name }))}
      defaultEventId={activeEventId(events)}
      storeCardPhotos={appConfig.storeCardPhotos}
      homeDock
      aiUsage={usageLabel ?? undefined}
    />
  );
}
