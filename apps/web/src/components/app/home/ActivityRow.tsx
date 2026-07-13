import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRelativeTimestamp } from "@/lib/time-buckets";

export interface ActivityRowProps {
  /** Letter shown in the avatar circle — contact or event name initial. */
  avatarLabel: string;
  title: string;
  description: string;
  timestamp: Date;
  /** Present for rows with no single contact (events) — navigates instead. */
  href?: string;
  /** Present for contact-linked rows — opens the detail panel in place. */
  onSelect?: () => void;
  /** Optional trailing action (e.g. "Reached out", "mark done"). */
  action?: React.ReactNode;
}

/**
 * One feed row: avatar + title/description + relative time. Shared by the
 * main activity feed and the open-follow-ups section so both draw from one
 * primitive instead of hand-rolling the row markup twice (the old
 * HomeActions/GoingQuiet duplication).
 */
export function ActivityRow({
  avatarLabel,
  title,
  description,
  timestamp,
  href,
  onSelect,
  action,
}: ActivityRowProps) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-sm text-amber">
        {avatarLabel}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-paper">{title}</span>
        <span className="block truncate text-xs text-fog">{description}</span>
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60">
        {formatRelativeTimestamp(timestamp)}
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 rounded-xl border border-seam bg-panel px-3 py-2.5">
      {href ? (
        <Link
          href={href}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors hover:bg-paper/[0.04]"
        >
          {content}
        </Link>
      ) : (
        <Button
          render={<div />}
          variant="ghost"
          onClick={onSelect}
          className="h-auto min-h-11 min-w-0 flex-1 items-center justify-start gap-3 rounded-lg p-0 text-left text-sm font-normal normal-case hover:bg-paper/[0.04]"
        >
          {content}
        </Button>
      )}
      {action ? <span className="shrink-0">{action}</span> : null}
    </li>
  );
}
