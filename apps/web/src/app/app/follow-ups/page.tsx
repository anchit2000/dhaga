import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllOpenFollowUps, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { getImportantDateLeadDays } from "@/lib/repo/suggestion-settings";
import { OpenFollowUpsList } from "./OpenFollowUpsList";
import { UpcomingDatesList } from "./UpcomingDatesList";

export const metadata = { title: "Follow-ups — Dhaga" };

/** Every open follow-up across the graph — the destination for Home's
 *  Follow-ups tile "+N more". Complete/dismiss are optimistic (OpenFollowUpsList)
 *  so a row clears instantly instead of blocking on the server round-trip.
 *
 *  Upcoming birthdays/anniversaries ride along underneath: same horizon, but
 *  awareness rather than work, so they never displace the actionable list.
 *  Sequential awaits, never Promise.all — fanning getDb() out exhausts the
 *  max-3 tenant pool. */
export default async function FollowUpsPage() {
  await requireUserIdForPage();
  const followUps = await listAllOpenFollowUps();
  const leadDays = await getImportantDateLeadDays();
  const upcomingDates = await listUpcomingImportantDates(leadDays);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OpenFollowUpsList followUps={followUps} />
      <UpcomingDatesList dates={upcomingDates} leadDays={leadDays} />
    </div>
  );
}
