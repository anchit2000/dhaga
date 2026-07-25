import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared shapes for route loading states. */

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/** One bento cell placeholder — mirrors HomeTile so Home doesn't reflow. */
export function TileSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-2xl border border-seam bg-panel p-4 sm:p-5", className)}>
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Home's metric strip as skeletons — mirrors StatStrip's 2/4-col grid so the
 *  region reserves its height and never reflows once the counts land. */
export function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-2xl border border-seam bg-panel p-4">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Home's adaptive dashboard as skeletons — mirrors the live two-zone layout
 *  (Today hero + attention rail, then the auto-fit secondary grid) so the route
 *  loader and the dashboard's own Suspense fallback never reflow on hydration. */
export function HomeBentoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <TileSkeleton rows={4} className="lg:col-span-2" />
        <div className="flex flex-col gap-4">
          <TileSkeleton rows={2} />
          <TileSkeleton rows={2} />
        </div>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <TileSkeleton rows={3} />
        <TileSkeleton rows={3} />
        <TileSkeleton rows={2} />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40 max-w-[60%]" />
            <Skeleton className="h-3 w-56 max-w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
