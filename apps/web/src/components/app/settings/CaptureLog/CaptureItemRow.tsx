import type { ReactElement } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { itemKindLabel } from "@/utils/constants/capture-log";
import { MESSAGING_ITEM_OUTCOME_LABELS } from "@/utils/constants/messaging";
import type { CaptureLogItemDto, CapturePayloadPreview } from "@/types/capture-log";

/**
 * One forwarded message inside an expanded batch: what was sent, and the
 * verdict the walk reached about it. A message with NO verdict is shown as
 * still pending rather than omitted — an unresolved message is the single most
 * useful thing this log has to say, so it must never render as a gap.
 *
 * Presentational and server-safe (no hooks), so it costs the client bundle
 * nothing beyond what its parent already pulls in.
 */
export function CaptureItemRow({ item }: { item: CaptureLogItemDto }): ReactElement {
  const verdict = item.outcomeKind ? MESSAGING_ITEM_OUTCOME_LABELS[item.outcomeKind] : null;
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-xs text-fog">{item.seq + 1}</span>
        <span className="text-xs text-fog">{itemKindLabel(item.kind)}</span>
        {verdict ? (
          <Badge variant="secondary" className="text-fog">
            {verdict}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber/40 text-ember">
            Not processed yet
          </Badge>
        )}
      </div>
      <PreviewText preview={item.preview} />
      <ItemLinks item={item} />
    </li>
  );
}

/** The message's own content. Each preview state gets its own words — "nothing
 *  was written" and "we could not read what was stored" are different facts and
 *  a user acting on them would do different things. */
function PreviewText({ preview }: { preview: CapturePayloadPreview }): ReactElement {
  if (preview.state === "text") {
    return <p className="text-sm break-words whitespace-pre-wrap text-paper">{preview.text}</p>;
  }
  if (preview.state === "empty") {
    return <p className="text-sm text-fog">No text came with this one.</p>;
  }
  return <p className="text-sm text-fog">Its stored content couldn&apos;t be read.</p>;
}

/** Where the verdict points. Renders nothing when it points nowhere, which is
 *  the normal case for an instruction or an unreadable message. */
function ItemLinks({ item }: { item: CaptureLogItemDto }): ReactElement | null {
  const { contactId, contactName, noteId, confirmationId, reason } = item.link;
  if (!contactId && !confirmationId && !reason && !noteId) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      {contactId ? (
        <Link
          href={`/app/people/${contactId}`}
          className="inline-flex min-h-11 items-center text-ember hover:underline"
        >
          {contactName ?? "View contact"}
        </Link>
      ) : null}
      {noteId ? <span className="text-fog">Note saved</span> : null}
      {confirmationId ? (
        <Link
          href="/app/confirmations"
          className="inline-flex min-h-11 items-center text-ember hover:underline"
        >
          Open Inbox
        </Link>
      ) : null}
      {reason ? <span className="text-fog">{reason}</span> : null}
    </div>
  );
}
