import { Skeleton } from "@/components/ui/skeleton";

/** Shared shapes for route loading states. */

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
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
