"use client";

import { useState, type ReactElement } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getCaptureLogPageAction } from "@/lib/actions/capture-log";
import type { CaptureLogCursorDto, CaptureLogEntryDto } from "@/types/capture-log";
import { CaptureBatchRow } from "./CaptureBatchRow";

/**
 * The capture log itself, newest batch first, a page at a time.
 *
 * `messaging_sessions` is append-only and never pruned, so this only stays fast
 * for a sender with years of history because every page is a keyset
 * `(created_at, id)` query — see `listCaptureLog`. There is deliberately no
 * page number and no total: an OFFSET would make page 50 fifty times the work
 * of page 1, and a COUNT(*) would scan the whole table to render a number
 * nobody acts on.
 *
 * The first page arrives server-rendered (`initialEntries`) so there is no
 * fetch on mount and nothing flashes; every page after it comes from the
 * action and is appended. The cursor is opaque here — it is echoed back
 * untouched, never constructed.
 */
export function CaptureLogList({
  initialEntries,
  initialCursor,
}: {
  initialEntries: CaptureLogEntryDto[];
  initialCursor: CaptureLogCursorDto | null;
}): ReactElement {
  const [entries, setEntries] = useState<CaptureLogEntryDto[]>(initialEntries);
  const [cursor, setCursor] = useState<CaptureLogCursorDto | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore(): Promise<void> {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await getCaptureLogPageAction(cursor);
      setEntries((current) => [...current, ...page.entries]);
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more batches. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (entries.length === 0) return <CaptureLogEmpty />;

  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-4 sm:p-6">
      {/* `multiple`: comparing two batches means having both open at once. */}
      <Accordion className="divide-y divide-seam" multiple>
        {entries.map((entry) => (
          <CaptureBatchRow key={entry.id} entry={entry} />
        ))}
      </Accordion>
      {cursor ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-seam pt-3">
          <Button variant="outline" size="sm" loading={loading} onClick={() => void loadMore()}>
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

/** Someone who has never used the bot lands here too — from the Messaging
 *  settings card — so the empty state has to explain the feature, not just
 *  report an absence. */
function CaptureLogEmpty(): ReactElement {
  return (
    <section className="space-y-2 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <p className="text-sm font-medium text-paper">Nothing forwarded yet</p>
      <p className="text-sm text-fog">
        Link a chat under Messaging, then forward a contact card, a note or a photo to your
        Dhaga bot and reply DONE. Every batch you send will show up here — what you sent,
        what Dhaga made of it, and where each message ended up.
      </p>
    </section>
  );
}
