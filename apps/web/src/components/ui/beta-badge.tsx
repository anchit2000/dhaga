import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BETA_LABEL, BETA_NOTE } from "@/utils/constants/beta";

/**
 * The "Beta" marker that sits beside the Dhaga wordmark — marketing header and
 * signed-in app shell both render THIS, so the two can never drift into two
 * different pills saying the same thing.
 *
 * It is a plain `<span>` (the shadcn `Badge` primitive, no `render`), not a
 * link: there is no honest destination for it, and an interactive element here
 * would need a 44px target it does not deserve next to a 20px wordmark.
 *
 * Colours are the calm amber pill `PlanGateNotice` already uses — `text-ember`
 * on an `amber/[0.05]` fill, never amber text. `--brand-ember` resolves to a
 * deep amber (#88500a, 6.5:1 on the light ground) in light and to amber itself
 * in dark, so one class pair is correct in both themes and under every
 * appearance preset, which override `--brand-*` wholesale.
 */
export function BetaBadge({ className }: { className?: string }): ReactElement {
  return (
    <Badge
      variant="outline"
      title={BETA_NOTE}
      className={cn(
        "shrink-0 border-amber/25 bg-amber/[0.05] px-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ember",
        className,
      )}
    >
      {BETA_LABEL}
    </Badge>
  );
}
