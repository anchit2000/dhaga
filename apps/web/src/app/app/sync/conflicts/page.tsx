import { requireUserIdForPage } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/request-scope";
import { listPendingSyncConflicts } from "@/lib/repo/sync";
import { SyncConflictList } from "@/components/app/sync/SyncConflictList";
import type { SyncConflictRow } from "@/components/app/sync/SyncConflictList";

export const metadata = { title: "Sync conflicts — Dhaga" };
export const dynamic = "force-dynamic";

/**
 * Where a contact-sync conflict is actually decided.
 *
 * The three-way merge adopts the phone's value on a both-edited field so the
 * edit made on the handset survives — a deliberate call. The value Dhaga held
 * is written to contact_links.conflicts rather than only reported in the push
 * response, and this page is what turns that stored value back into a choice.
 * The mobile sync report points here by name.
 *
 * Force-dynamic: the pending set changes on every sync run and as rows are
 * resolved here. Reads the request-pinned connection (`getDb()`) rather than
 * opening its own scope — a second checkout from the small tenant pool during a
 * render is the exhaustion bug this codebase has shipped repeatedly.
 */
export default async function SyncConflictsPage(): Promise<React.ReactElement> {
  await requireUserIdForPage();
  const pending = await listPendingSyncConflicts(await getDb());
  const rows: SyncConflictRow[] = pending.flatMap((link) =>
    link.conflicts.map((conflict) => ({
      ...conflict,
      linkId: link.linkId,
      contactId: link.contactId,
      contactName: link.contactName,
    })),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ember">Contact sync</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Sync conflicts</h1>
        <p className="mt-1.5 text-sm text-fog">
          Fields a connected address book and Dhaga both changed. Dhaga took the address
          book&apos;s value so the edit you made there survived — the value it held is kept
          here until you decide. Restoring it also sends it back on the next sync.
        </p>
      </div>
      <SyncConflictList rows={rows} />
    </div>
  );
}
