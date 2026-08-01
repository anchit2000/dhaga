"use client";

import { useState } from "react";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  getAiCreditActivityPageAction,
  type AiCreditActivityCursor,
  type AiCreditActivityRowDto,
} from "@/lib/actions/ai-credits";
import { formatRelativeTime } from "@/utils/format-date";
import { creditsLabel } from "./format";

/** `at` back as a `Date` for `formatRelativeTime` — the inverse of the ISO
 *  conversion done at the server/client boundary (AiCreditsSetting, the
 *  server action). */
interface ActivityRow {
  id: string;
  label: string;
  credits: number;
  free: boolean;
  at: Date;
}

function fromDto(row: AiCreditActivityRowDto): ActivityRow {
  return { id: row.id, label: row.label, credits: row.credits, free: row.free, at: new Date(row.at) };
}

// One pseudo-column: rows render as the existing fused "label · cost · time"
// line, not a real grid, so there is nothing else for react-table to model —
// this only exists to drive the list off `table.getRowModel()` per row rather
// than a raw `.map`.
const columns: ColumnDef<ActivityRow>[] = [{ id: "activity", accessorKey: "id" }];

/**
 * The full AI-action history for this account, newest first, loaded a page at
 * a time via "Load more". `ai_actions` is append-only and never pruned, so
 * this only stays fast for an account with years of history because every
 * page is a keyset (created_at, id) query — see `listAiCreditActivityPage` —
 * never an OFFSET that gets slower as the account ages.
 *
 * The first page is server-rendered (`initialRows`, from `getAiCreditsOverview`
 * — no fetch on mount); every page after that comes from
 * `getAiCreditActivityPageAction`, appended to local state. Plain state rather
 * than this repo's `usePagedData` react-query gateway: that gateway always
 * starts its first page at cursor `null`, with no way to seed it from a page
 * already rendered on the server, and re-fetching page one on mount would
 * both duplicate work and flash a reload of rows already on screen.
 */
export function ActivityCard({
  initialRows,
  initialCursor,
}: {
  initialRows: AiCreditActivityRowDto[];
  initialCursor: AiCreditActivityCursor | null;
}) {
  const [rows, setRows] = useState<ActivityRow[]>(() => initialRows.map(fromDto));
  const [cursor, setCursor] = useState<AiCreditActivityCursor | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  async function loadMore(): Promise<void> {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await getAiCreditActivityPageAction(cursor);
      setRows((current) => [...current, ...page.rows.map(fromDto)]);
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more activity. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Recent activity</h2>
        <p className="mt-1 text-sm text-fog">Every AI action on this account, newest first.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-fog">Nothing yet — no AI action has run on this account.</p>
      ) : (
        <ul className="divide-y divide-seam border-t border-seam">
          {table.getRowModel().rows.map((tableRow) => {
            const row = tableRow.original;
            return (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5">
                <span className="min-w-0 text-sm text-paper">{row.label}</span>
                <span className="text-xs text-fog">
                  · {row.free ? "Free" : creditsLabel(row.credits)} ·{" "}
                  {formatRelativeTime(row.at, now)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {cursor ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-seam pt-3">
          <Button variant="outline" size="sm" loading={loading} onClick={loadMore}>
            Load more
          </Button>
          {error ? (
            <span className="text-xs text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
