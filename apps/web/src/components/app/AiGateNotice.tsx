import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_GATE_DETAIL_HREF } from "@/utils/constants/ai-gate";

/**
 * Says WHY an AI control is greyed out. A disabled button with no explanation is
 * worse than a failed click, and the disabled Button sets
 * `pointer-events-none`, so a hover/`title` hint would never fire — the reason
 * has to be adjacent text.
 *
 * Deliberately the calm amber pill from ExtractionStatus's `blocked` branch, not
 * `FormError`'s red: running out of credits is a plan state, not a failure, and
 * the app already reserves destructive styling for genuine errors.
 */
export function AiGateNotice({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}): React.ReactElement {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-amber/25 bg-amber/[0.05] px-3 py-2 text-xs text-fog",
        className,
      )}
    >
      <Sparkles className="size-3.5 shrink-0 text-ember" aria-hidden />
      <span className="min-w-0 flex-1">{reason}</span>
      <Link
        href={AI_GATE_DETAIL_HREF}
        className="shrink-0 font-medium text-ember transition-colors hover:underline"
      >
        See credits
      </Link>
    </p>
  );
}
