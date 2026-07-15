import { cn } from "@/lib/utils";
import { eventColorHex } from "@/utils/constants/events";

const SIZES = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-lg",
} as const;

/**
 * The colour-coded avatar for a group: the chosen colour tints the circle and
 * the emoji (or the name's initial) sits inside it. Falls back to the brand
 * amber when no colour is set. Presentational — safe in server or client trees.
 */
export function EventBadge({
  name,
  emoji,
  color,
  size = "md",
  className,
}: {
  name: string;
  emoji?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hex = eventColorHex(color);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display",
        SIZES[size],
        hex ? null : "bg-amber/15 text-amber",
        className,
      )}
      style={hex ? { backgroundColor: `${hex}26`, color: hex } : undefined}
    >
      {emoji || name.charAt(0).toUpperCase()}
    </span>
  );
}
