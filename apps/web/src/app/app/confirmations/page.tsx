import { requireUserIdForPage } from "@/lib/auth/guard";
import { ConfirmationsInbox } from "@/components/app/confirmations/ConfirmationsInbox";

export const metadata = { title: "Confirmations — Dhaga" };
export const dynamic = "force-dynamic";

/**
 * The confirmations inbox — doubts the extractor raised before writing anything
 * to the graph. Force-dynamic: the pending set changes as notes are captured and
 * as the user resolves rows here.
 */
export default async function ConfirmationsPage(): Promise<React.ReactElement> {
  const userId = await requireUserIdForPage();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ember">Inbox</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Confirmations</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog">
          Doubts the extractor raised before touching your graph. Confirm or dismiss each —
          nothing is written until you do.
        </p>
      </div>
      <ConfirmationsInbox userId={userId} />
    </div>
  );
}
