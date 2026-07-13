import Link from "next/link";
import { hasLLM } from "@dhaga/core";
import { ActivityFeed } from "@/components/app/home/ActivityFeed";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { Button } from "@/components/ui/button";
import { activeEventId } from "@/lib/active-event";
import { aiActionsUsedThisMonth, monthlyAiCap } from "@/lib/ai/metering";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listRecentActivity } from "@/lib/repo/activity";
import { listEvents } from "@/lib/repo/events";
import { listAllOpenFollowUps } from "@/lib/repo/reminders";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { HOME_ACTIVITY_FEED_LIMIT, HOME_PREVIEW_LIMIT } from "@/utils/constants/app";

export const metadata = { title: "Home — Dhaga" };

export default async function HomePage() {
  await requireUserIdForPage();
  const llmEnabled = hasLLM();
  const [activity, openFollowUps, events, used, storeCardPhotos] = await Promise.all([
    listRecentActivity(HOME_ACTIVITY_FEED_LIMIT),
    listAllOpenFollowUps(),
    listEvents(HOME_PREVIEW_LIMIT),
    llmEnabled ? aiActionsUsedThisMonth() : Promise.resolve(0),
    shouldStoreCardPhotos(),
  ]);

  return <div className="space-y-8 pb-16">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] uppercase tracking-widest text-amber">Your network, threaded</p><h1 className="mt-1 font-display text-2xl tracking-tight">Home</h1></div>
      <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
    </div>

    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-seam bg-panel px-3 py-2.5">
      <span className="shrink-0 text-xs text-fog">New event</span>
      <CreateEventForm />
    </section>

    <ActivityFeed items={activity} openFollowUps={openFollowUps} />

    <QuickAddForm events={events.map(({ id, name }) => ({ id, name }))} defaultEventId={activeEventId(events)} storeCardPhotos={storeCardPhotos} homeDock aiUsage={llmEnabled ? `${used} of ${monthlyAiCap()} AI actions used` : undefined} />
  </div>;
}
