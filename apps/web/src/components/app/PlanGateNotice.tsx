"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAN_GATE_TOOLTIP_DELAY_MS } from "@/utils/constants/plans";

/**
 * The one affordance for a control a PLAN puts out of reach — wrap the control,
 * pass the reason, done. Used by the API-tokens and messaging-link gates so the
 * two can never drift into explaining the same entitlement two different ways.
 *
 * `reason === null` means entitled: children render bare, with no wrapper, no
 * tab stop and no notice.
 *
 * It says WHY three times over, and all three are load-bearing:
 *  1. a TOOLTIP on hover — the discoverable hint for a mouse user;
 *  2. the same tooltip on KEYBOARD FOCUS, which is why the trigger is a
 *     focusable wrapper `div` and not the control: a disabled control is
 *     `pointer-events-none` and out of the tab order, so it can neither be
 *     hovered nor focused and would silently swallow both;
 *  3. VISIBLE adjacent text, because hover and focus both do not exist on a
 *     touch screen — and mobile-first is non-negotiable here (CLAUDE.md), so
 *     the phone case has to be the one that works without the other two.
 *
 * Styled as the calm amber pill `AiGateNotice` uses, not `FormError`'s red: a
 * plan boundary is a state, not a failure, and destructive styling is reserved
 * for genuine errors.
 */
export function PlanGateNotice({
  reason,
  children,
  className,
}: {
  /** Why the wrapped control is unavailable, or null when it is available. */
  reason: string | null;
  children: ReactNode;
  className?: string;
}): ReactElement {
  const reasonId = useId();

  if (!reason) return <>{children}</>;

  return (
    <div className={cn("space-y-2", className)}>
      <Tooltip>
        <TooltipTrigger
          delay={PLAN_GATE_TOOLTIP_DELAY_MS}
          render={
            <div
              tabIndex={0}
              aria-describedby={reasonId}
              className="rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
      <p
        id={reasonId}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-amber/25 bg-amber/[0.05] px-3 py-2 text-xs text-fog"
      >
        <Lock className="size-3.5 shrink-0 text-ember" aria-hidden />
        <span className="min-w-0 flex-1">{reason}</span>
      </p>
    </div>
  );
}
