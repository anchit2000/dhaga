"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";

/**
 * How the goal status LOOKS. ./GoalStatus decides what it says; these three
 * pieces are the only shapes it can say it in, so the split keeps that decision
 * readable and this file free of any state reasoning.
 */

/** Icon + wrapping text. No `truncate` anywhere: these sentences must wrap at
 *  375px rather than be cut off — the objective is the only thing that elides. */
export function Note({
  icon,
  destructive,
  children,
}: {
  icon: ReactNode;
  destructive?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed",
        destructive ? "text-destructive" : "text-fog",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

/** Re-opens the goal dialog. `min-h-11` is the ≥44px touch target the rest of
 *  this strip uses — the repo's Button sizes top out at 36px. `text-ember`, not
 *  amber: amber is 1.83:1 on the light ground and is a fill here, never text. */
export function EditGoalButton({ onEdit }: { onEdit: () => void }): ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 min-h-11 px-2 font-normal normal-case text-ember hover:text-paper"
      onClick={onEdit}
    >
      Reword the goal
    </Button>
  );
}

/** Buys the match the nightly pass would do for free. It opens the confirmation
 *  rather than spending anything, so the price is always seen before the spend.
 *  Same `min-h-11` touch target as EditGoalButton; `outline` rather than the
 *  amber-filled default because the goal strip already sits on an amber wash and
 *  a second fill on top of it is noise. */
export function RequestNowButton({ onRequest }: { onRequest: () => void }): ReactElement {
  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-2 min-h-11 gap-1.5 font-normal normal-case"
      onClick={onRequest}
    >
      <Sparkles /> Request now
    </Button>
  );
}

/** The burn-down. Only ever rendered for a cohort that HAS members, so it can
 *  never sit at 0% standing in for "we haven't looked yet" — which is what made
 *  the old strip read as a hang. */
export function GoalProgressBar({ done, total }: { done: number; total: number }): ReactElement {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      {/* Amber as a FILL over the seam track — never amber as text. */}
      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-seam">
        <div
          className="h-full rounded-full bg-amber transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-fog">
        {done} of {total} done
      </span>
    </div>
  );
}
