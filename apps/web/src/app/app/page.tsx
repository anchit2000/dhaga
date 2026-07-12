import Link from "next/link";
import { hasLLM } from "@dhaga/core";
import { HomeActions } from "@/components/app/home/HomeActions";
import { HomeOverview } from "@/components/app/home/HomeOverview";
import { GoingQuiet } from "@/components/app/home/GoingQuiet";
import { SignalsFeed } from "@/components/app/home/SignalsFeed";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { Button } from "@/components/ui/button";
import { activeSessionId } from "@/lib/active-session";
import { aiActionsUsedThisMonth, monthlyAiCap } from "@/lib/ai/metering";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listSessions } from "@/lib/repo/sessions";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";

export const metadata = { title: "Home — Dhaga" };

export default async function HomePage() {
  await requireUserIdForPage();
  const llmEnabled = hasLLM();
  const [people, sessions, dueReachOuts, openFollowUps, quietContacts, newSignals, used, storeCardPhotos] = await Promise.all([
    listContacts(), listSessions(), listDueReachOuts(), listAllOpenFollowUps(),
    listQuietContacts(), listNewSignals(), llmEnabled ? aiActionsUsedThisMonth() : Promise.resolve(0),
    shouldStoreCardPhotos(),
  ]);

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] uppercase tracking-widest text-amber">Your network, threaded</p><h1 className="mt-1 font-display text-2xl tracking-tight">Home</h1></div>
      <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
    </div>

    <section className="rounded-2xl border border-seam bg-panel p-4 sm:p-5">
      <div className="mb-4"><h2 className="font-display text-lg">Capture someone</h2><p className="mt-1 text-sm text-fog">Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.</p>{llmEnabled ? <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fog/60">{used} of {monthlyAiCap()} AI actions used</p> : null}</div>
      <QuickAddForm sessions={sessions.map(({ id, name }) => ({ id, name }))} defaultSessionId={activeSessionId(sessions)} storeCardPhotos={storeCardPhotos} />
    </section>

    <HomeOverview people={people} sessions={sessions} />
    <HomeActions dueReachOuts={dueReachOuts} openFollowUps={openFollowUps} />
    <SignalsFeed signals={newSignals} />
    <GoingQuiet contacts={quietContacts} />
  </div>;
}
