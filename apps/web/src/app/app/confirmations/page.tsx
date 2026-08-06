import { requireUserIdForPage } from "@/lib/auth/guard";
import { ConfirmationsInbox } from "@/components/app/confirmations/ConfirmationsInbox";

export const metadata = { title: "Confirmations — Dhaga" };
export const dynamic = "force-dynamic";

/**
 * The confirmations inbox — most doubts gate graph writes, while ambiguous
 * dates arrive with a safe default already scheduled. Force-dynamic because
 * pending rows change as notes are captured and resolved.
 */
export default async function ConfirmationsPage(): Promise<React.ReactElement> {
  const userId = await requireUserIdForPage();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ember">Inbox</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Confirmations</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog">
          Most questions wait before changing your graph. Date questions already have a
          scheduled default, which you can keep or move.
        </p>
      </div>
      <ConfirmationsInbox userId={userId} />
    </div>
  );
}
