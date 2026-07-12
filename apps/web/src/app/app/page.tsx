import Link from "next/link";
import { hasLLM } from "@dhaga/core";
import { HomeActions } from "@/components/app/home/HomeActions";
import { HomeOverview } from "@/components/app/home/HomeOverview";
import { GoingQuiet } from "@/components/app/home/GoingQuiet";
import { SignalsFeed } from "@/components/app/home/SignalsFeed";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { Button } from "@/components/ui/button";
import { activeEventId } from "@/lib/active-event";
import { aiActionsUsedThisMonth, monthlyAiCap } from "@/lib/ai/metering";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listEvents } from "@/lib/repo/events";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";

export const metadata = { title: "Home — Dhaga" };

export default async function HomePage() {
  await requireUserIdForPage();
  const llmEnabled = hasLLM();
  const [people, events, dueReachOuts, openFollowUps, quietContacts, newSignals, used, storeCardPhotos] = await Promise.all([
    listContacts(undefined, undefined, HOME_PREVIEW_LIMIT), listEvents(HOME_PREVIEW_LIMIT), listDueReachOuts(), listAllOpenFollowUps(),
    listQuietContacts(), listNewSignals(), llmEnabled ? aiActionsUsedThisMonth() : Promise.resolve(0),
    shouldStoreCardPhotos(),
  ]);

  return <div className="space-y-8 pb-16">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] uppercase tracking-widest text-amber">Your network, threaded</p><h1 className="mt-1 font-display text-2xl tracking-tight">Home</h1></div>
      <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
    </div>

    <section className="space-y-5">
      <h2 className="font-display text-lg">Updates</h2>
      <HomeActions dueReachOuts={dueReachOuts} openFollowUps={openFollowUps} />
      <SignalsFeed signals={newSignals} />
      <GoingQuiet contacts={quietContacts} />
    </section>
    <HomeOverview people={people} events={events} />
    <QuickAddForm events={events.map(({ id, name }) => ({ id, name }))} defaultEventId={activeEventId(events)} storeCardPhotos={storeCardPhotos} homeDock aiUsage={llmEnabled ? `${used} of ${monthlyAiCap()} AI actions used` : undefined} />
  </div>;
}
