import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { HOME_TILE_TONE_CLASSES } from "@/utils/constants/home";
import type { HomeTileTone } from "@/utils/constants/home";

/**
 * One cell of Home's grid — shared shell (border, padding, header row) so every
 * tile reads identically. Semantic tones add a restrained border cue while
 * action remains amber.
 *
 * `viewAll` renders the footer link every tile ends on. It lives here rather
 * than in each tile because the cells are equal-height: the link has to sit on
 * the SAME baseline across the row, which only holds if one component owns the
 * `mt-auto` and the spacing. It also sits OUTSIDE the scrolling body below, so
 * the click target can never be pushed under a fold — a tile whose own footer
 * is a navigation target belongs in this prop, not in `children`.
 *
 * The body scrolls once the cell is capped (HOME_TILE_CAP_CLASS): overflowing
 * content is what used to stretch every neighbour in the grid row. Capped from
 * `sm:` only, so at 375px the body is unconstrained and never scrolls.
 */
export function HomeTile({
  title,
  meta,
  tone = "default",
  viewAll,
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title: string;
  meta?: ReactNode;
  tone?: HomeTileTone;
  viewAll?: { href: string; label?: string };
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border bg-panel p-4 sm:p-5",
        HOME_TILE_TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg">{title}</h2>
        {meta}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overscroll-contain sm:overflow-y-auto">{children}</div>
      {viewAll ? (
        <Link
          href={viewAll.href}
          className="-mb-1 inline-flex min-h-11 items-center gap-1.5 border-t border-seam pt-3 text-xs text-ember hover:underline"
        >
          {viewAll.label ?? "View all"}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
