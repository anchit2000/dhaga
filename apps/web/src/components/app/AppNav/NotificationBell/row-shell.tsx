"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The chrome every bell row shares, and the two affordances a row can carry.
 * Split from ./rows.tsx per the 150-line rule; which affordance a KIND gets is
 * still decided there.
 */

/** Chip: relative timing. Amber is a fill here, never light-mode text. */
export const CHIP = "mt-0.5 inline-flex rounded-full px-1.5 py-0.5 font-mono text-[10px]";

/**
 * Completing a follow-up keeps its VISIBLE word: an unlabelled check beside a
 * reminder is ambiguous and destructive-feeling. The ≥44px touch target comes
 * from min-height + padding, not from dropping the label — `size="xs"` still
 * sets the type scale while `min-h-11` overrides its height.
 */
export function DoneAction({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      className="absolute right-1 top-1 min-h-11 gap-1 rounded-full px-2.5 text-fog hover:text-ember"
    >
      <Check className="size-3" />
      Done
    </Button>
  );
}

/**
 * Dismiss stays an icon: it matches the app's established dismiss affordance
 * (HomeActions' ghost X with `aria-label="Dismiss follow-up"`, and the same X in
 * ConnectionsSection / RelationshipDeleteButton), and the kinds honestly differ
 * — only a follow-up can be COMPLETED, which is the ambiguous verb.
 */
export function DismissAction({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Dismiss notification"
      onClick={onClick}
      className="absolute right-1 top-1 size-11 rounded-full text-fog hover:text-ember"
    >
      <X className="size-4" />
    </Button>
  );
}

/**
 * `pr-20` reserves room for the widest affordance (the "Done" pill, ~66px) so
 * the title truncates instead of sliding under it — at 375px the panel is 320px
 * wide, which still leaves ~220px of readable name.
 */
export function RowShell({
  href,
  onOpen,
  action,
  children,
}: {
  href: string | null;
  onOpen?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative">
      <DropdownMenuItem
        render={href ? <Link href={href} /> : undefined}
        onClick={onOpen}
        className={cn("flex-col items-start gap-0.5", action ? "pr-20" : "pr-2")}
      >
        {children}
      </DropdownMenuItem>
      {action}
    </div>
  );
}

export function RowTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="w-full truncate text-sm font-medium text-paper">{children}</span>;
}
