import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * One cell of Home's grid — shared shell (border, padding, header row) so every
 * tile reads identically. `tone="amber"` marks needs-attention tiles.
 *
 * `viewAll` renders the footer link every tile ends on. It lives here rather
 * than in each tile because the cells are equal-height: the link has to sit on
 * the SAME baseline across the row, which only holds if one component owns the
 * `mt-auto` and the spacing. Children still sit in a flex column, so a tile with
 * extra footer content of its own can pin that with `mt-auto` too.
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
  tone?: "default" | "amber";
  viewAll?: { href: string; label?: string };
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border bg-panel p-4 sm:p-5",
        tone === "amber"
          ? "border-amber/25 bg-gradient-to-br from-amber/[0.06] via-transparent to-transparent"
          : "border-seam",
        className,
      )}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg">{title}</h2>
        {meta}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>
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
