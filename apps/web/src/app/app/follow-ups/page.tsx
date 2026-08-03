import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllOpenFollowUps, listDueReachOuts, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { getImportantDateLeadDays } from "@/lib/repo/suggestion-settings";
import { DueCheckInsList } from "./DueCheckInsList";
import { OpenFollowUpsList } from "./OpenFollowUpsList";
import { UpcomingDatesList } from "./UpcomingDatesList";

export const metadata = { title: "Follow-ups — Dhaga" };

/** Every open follow-up across the graph — the destination for Home's
 *  Follow-ups tile "+N more". Complete/dismiss are optimistic (OpenFollowUpsList)
 *  so a row clears instantly instead of blocking on the server round-trip.
 *
 *  People whose keep-in-touch rhythm has run out sit below it (#due, where Home's
 *  Today tile sends "+N more due"), and upcoming birthdays/anniversaries below
 *  those: work first, then awareness. `listDueReachOuts` runs HERE rather than on
 *  Home, which already fans 12 reads at a max-3 tenant pool — Home has the list
 *  in hand for its counter and passes only the number.
 *
 *  Sequential awaits, never Promise.all — fanning getDb() out exhausts the
 *  max-3 tenant pool. */
export default async function FollowUpsPage() {
  await requireUserIdForPage();
  const followUps = await listAllOpenFollowUps();
  const due = await listDueReachOuts();
  const leadDays = await getImportantDateLeadDays();
  const upcomingDates = await listUpcomingImportantDates(leadDays);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OpenFollowUpsList followUps={followUps} />
      <DueCheckInsList due={due} />
      <UpcomingDatesList dates={upcomingDates} leadDays={leadDays} />
    </div>
  );
}
