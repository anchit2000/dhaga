import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * One cell of Home's bento grid — shared shell (border, padding, header row)
 * so every tile reads identically. `tone="amber"` marks needs-attention tiles.
 * Children sit in a flex column, so a tile footer can pin itself to the
 * bottom of a stretched cell with `mt-auto`.
 */
export function HomeTile({
  title,
  meta,
  tone = "default",
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title: string;
  meta?: ReactNode;
  tone?: "default" | "amber";
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
    </section>
  );
}
