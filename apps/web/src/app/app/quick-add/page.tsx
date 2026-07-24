import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { aiActionsUsedThisMonth, aiUsageLabel, effectiveMonthlyAiCap } from "@/lib/ai/metering";
import { getBillingGate } from "@/lib/hosted/gate";
import { listEvents } from "@/lib/repo/events";
import { activeEventId } from "@/lib/active-event";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { hasLLM } from "@dhaga/core";

export const metadata = { title: "Quick add — Dhaga" };

export default async function QuickAddPage() {
  const userId = await requireUserIdForPage();
  const [events, used, unlimited, appConfig] = await Promise.all([
    listEvents(),
    hasLLM() ? aiActionsUsedThisMonth() : Promise.resolve(0),
    hasLLM() ? getBillingGate().then((g) => g.hasUnlimitedAi(userId)) : Promise.resolve(false),
    getCachedAppConfig(userId),
  ]);
  const storeCardPhotos = appConfig.storeCardPhotos;
  const usageLabel = hasLLM()
    ? aiUsageLabel({ used, cap: await effectiveMonthlyAiCap(), unlimited })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Quick add</h1>
        <p className="mt-1 text-sm text-fog">
          Paste an email signature, card text, or an intro — Dhaga extracts the
          person and keeps the original text as the receipt.
        </p>
        {usageLabel ? (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-fog/60">
            {usageLabel}
          </p>
        ) : null}
      </div>
      <QuickAddForm
        events={events.map(({ id, name, emoji }) => ({ id, name, emoji }))}
        defaultEventId={activeEventId(events)}
        storeCardPhotos={storeCardPhotos}
      />
    </div>
  );
}
