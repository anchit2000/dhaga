import { PageHeaderSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mirrors Home's bento grid so the page doesn't reflow when data lands. */
function TileSkeleton({ rows, className }: { rows: number; className?: string }) {
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

export default function AppLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label="Loading page" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
        <TileSkeleton rows={4} className="sm:col-span-2 xl:row-span-2" />
        <TileSkeleton rows={2} />
        <TileSkeleton rows={3} />
        <TileSkeleton rows={3} />
        <TileSkeleton rows={2} className="xl:col-span-2" />
      </div>
    </div>
  );
}
