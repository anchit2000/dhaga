import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllOpenFollowUps } from "@/lib/repo/reminders";
import { OpenFollowUpsList } from "./OpenFollowUpsList";

export const metadata = { title: "Follow-ups — Dhaga" };

/** Every open follow-up across the graph — the destination for Home's
 *  Follow-ups tile "+N more". Complete/dismiss are optimistic (OpenFollowUpsList)
 *  so a row clears instantly instead of blocking on the server round-trip. */
export default async function FollowUpsPage() {
  await requireUserIdForPage();
  const followUps = await listAllOpenFollowUps();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OpenFollowUpsList followUps={followUps} />
    </div>
  );
}
