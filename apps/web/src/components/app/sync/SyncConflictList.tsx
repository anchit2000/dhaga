"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatSyncValue } from "@/components/app/sync/formatSyncValue";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { resolveSyncConflictAction } from "@/lib/actions/sync";
import {
  SYNC_CONFLICT_KEEP_DHAGA,
  SYNC_CONFLICT_KEEP_PHONE,
  SYNC_CONFLICT_KIND_LABELS,
  SYNC_FIELD_LABELS,
} from "@/utils/constants/sync";
import type { SyncConflictChoice } from "@/utils/constants/sync";
import type { PersistedSyncConflict } from "@dhaga/core/src/sync/types";

/** One undecided field, flattened out of its link so each row resolves alone. */
export interface SyncConflictRow extends PersistedSyncConflict {
  linkId: string;
  contactId: string;
  contactName: string;
}

/**
 * The pending sync conflicts, one row per contested field.
 *
 * This is the screen the mobile sync report sends people to. Both values are
 * shown side by side, because the whole point is that the user can see what
 * Dhaga lost — and take it back.
 */
export function SyncConflictList({ rows }: { rows: SyncConflictRow[] }): React.ReactElement {
  const { items, remove } = useOptimisticList<SyncConflictRow>({
    items: rows,
    errorMessage: "Couldn't save that decision — try again.",
  });

  function resolve(row: SyncConflictRow, choice: SyncConflictChoice): void {
    const formData = new FormData();
    formData.set("linkId", row.linkId);
    formData.set("contactId", row.contactId);
    formData.set("field", row.field);
    formData.set("choice", choice);
    remove(row, () => resolveSyncConflictAction(formData));
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-seam bg-panel p-8 text-center">
        <p className="text-sm text-paper">Nothing to decide.</p>
        <p className="mt-1 text-sm text-fog">
          Every field your phone and Dhaga disagreed on has been settled.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((row) => (
        <li
          key={`${row.linkId}:${row.field}`}
          className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
        >
          <div>
            <Link
              href={`/app/people/${row.contactId}`}
              className="text-sm font-medium text-paper underline-offset-4 hover:underline"
            >
              {row.contactName}
            </Link>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ember">
              {SYNC_FIELD_LABELS[row.field]} · {SYNC_CONFLICT_KIND_LABELS[row.kind]}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-seam bg-wash/[0.04] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
                Dhaga had
              </p>
              <p className="mt-1 text-sm break-words text-paper">
                {formatSyncValue(row.field, row.local)}
              </p>
            </div>
            <div className="rounded-xl border border-seam bg-wash/[0.04] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
                Your phone had (in use now)
              </p>
              <p className="mt-1 text-sm break-words text-paper">
                {formatSyncValue(row.field, row.remote)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="sm"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => resolve(row, SYNC_CONFLICT_KEEP_DHAGA)}
            >
              Restore Dhaga&apos;s value
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => resolve(row, SYNC_CONFLICT_KEEP_PHONE)}
            >
              Keep the phone&apos;s
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
