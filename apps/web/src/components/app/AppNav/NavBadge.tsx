import { cn } from "@/lib/utils";

/** Small amber count pill for a nav item (pending confirmations). Hidden at
 *  zero so the nav stays quiet when there's nothing to act on. The optional
 *  className lets callers reposition it (e.g. corner overlay on icon-only
 *  mobile pills). */
export function NavBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}): React.ReactElement | null {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 font-mono text-[10px] font-medium text-ember",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
