"use client";

import { useState, type ReactElement } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { getCaptureLogItemsAction } from "@/lib/actions/capture-log";
import { formatDateTime } from "@/utils/format-date";
import { sessionStatusLabel } from "@/utils/constants/capture-log";
import { MESSAGING_PROVIDER_LABELS } from "@/utils/constants/messaging";
import type { BuiltinMessagingProvider } from "@/utils/constants/messaging";
import type { CaptureLogEntryDto, CaptureLogItemDto } from "@/types/capture-log";
import { CaptureItemRow } from "./CaptureItemRow";

/**
 * One batch: the header always tells the whole outcome (when, channel, status,
 * how many messages, what the sender was replied with), so the log is readable
 * without expanding anything. Expanding fetches THAT batch's messages and
 * nothing else — once, and only if it is opened.
 */
export function CaptureBatchRow({ entry }: { entry: CaptureLogEntryDto }): ReactElement {
  const [items, setItems] = useState<CaptureLogItemDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (items || loading) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await getCaptureLogItemsAction(entry.id));
    } catch {
      // Never surface the raw error: it could carry ids, and the user's only
      // useful move is the same either way.
      setError("Couldn't load this batch's messages. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const channel =
    MESSAGING_PROVIDER_LABELS[entry.provider as BuiltinMessagingProvider] ?? entry.provider;

  return (
    <AccordionItem
      value={entry.id}
      onOpenChange={(open: boolean) => {
        if (open) void load();
      }}
    >
      {/* The trigger renders a <button>, whose content model is phrasing only —
          hence spans throughout rather than the div/p this layout would
          otherwise use. */}
      <AccordionTrigger className="min-h-11 gap-3 px-1 hover:no-underline">
        <span className="block min-w-0 space-y-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm text-paper">{channel}</span>
            <span className="text-xs font-normal text-fog">
              {formatDateTime(new Date(entry.createdAt))}
            </span>
            <Badge variant={entry.failureLabel ? "destructive" : "secondary"} className="font-normal">
              {sessionStatusLabel(entry.status)}
            </Badge>
          </span>
          <span className="block text-xs font-normal text-fog">
            {entry.itemCount} {entry.itemCount === 1 ? "message" : "messages"}
            {entry.unresolvedCount > 0 ? ` · ${entry.unresolvedCount} unresolved` : ""}
          </span>
          {entry.failureLabel ? (
            <span className="block text-xs font-normal text-destructive">{entry.failureLabel}</span>
          ) : entry.summary ? (
            <span className="block text-xs font-normal break-words text-fog">{entry.summary}</span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-1">
        <BatchItems items={items} loading={loading} error={error} />
      </AccordionContent>
    </AccordionItem>
  );
}

function BatchItems({
  items,
  loading,
  error,
}: {
  items: CaptureLogItemDto[] | null;
  loading: boolean;
  error: string | null;
}): ReactElement {
  if (error) {
    return (
      <p className="py-2 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (loading || !items) {
    return (
      <p className="py-2 text-sm text-fog" aria-busy="true">
        Loading messages…
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="py-2 text-sm text-fog">This batch has no messages stored.</p>;
  }
  return (
    <ul className="divide-y divide-seam border-t border-seam">
      {items.map((item) => (
        <CaptureItemRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
