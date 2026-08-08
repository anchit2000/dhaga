"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  COMING_SOON_LABEL,
  COMING_SOON_TOOLTIP_DELAY_MS,
} from "@/utils/constants/coming-soon";

/**
 * The one affordance for a control that BETA has not finished yet — an
 * unconfigured provider, or a feature whose other half is unbuilt. Wrap the
 * control, pass the reason, disable the control itself, done.
 *
 * `reason === null` means available: children render bare, with no wrapper, no
 * tab stop and no notice.
 *
 * Mechanically identical to its sibling `PlanGateNotice`, and for the same
 * three load-bearing reasons: a TOOLTIP on hover; the same tooltip on KEYBOARD
 * FOCUS (which is why the trigger is a focusable wrapper `div` and not the
 * control — a disabled control is `pointer-events-none` and out of the tab
 * order, so it can be neither hovered nor focused); and VISIBLE adjacent text,
 * because neither hover nor focus exists on a touch screen and mobile-first is
 * non-negotiable (CLAUDE.md).
 *
 * It is a SEPARATE component, not a `variant` of the plan gate, because the two
 * say opposite things. A plan gate is an upsell: pay and it works. "Coming
 * soon" is an admission: nobody can have this yet, at any price. Sharing one
 * component would let sales copy leak into an honesty notice, which is the
 * whole failure mode this is here to prevent — so nothing here links to
 * pricing, and the amber plan-gate pill is deliberately not reused. This one is
 * neutral (seam/fog): a missing feature is not an accent, and it is not a
 * failure either, so `text-destructive` is wrong too.
 */
export function ComingSoonNotice({
  reason,
  children,
  className,
}: {
  /** Why the wrapped control does nothing yet, or null when it works. */
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
          delay={COMING_SOON_TOOLTIP_DELAY_MS}
          render={
            <div
              tabIndex={0}
              aria-describedby={reasonId}
              /* No opacity here — the wrapped control is `disabled`, and its own
                 `disabled:opacity-*` does the dimming. Stacking a second 60%
                 on top drove the mic icon to ~0.36 and under the contrast
                 floor. Matches `PlanGateNotice`, which dims nothing either. */
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
        className="flex flex-wrap items-center gap-2 rounded-lg border border-seam bg-wash/[0.03] px-3 py-2 text-xs text-fog"
      >
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-fog">
          {COMING_SOON_LABEL}
        </span>
        <span className="min-w-0 flex-1">{reason}</span>
      </p>
    </div>
  );
}
