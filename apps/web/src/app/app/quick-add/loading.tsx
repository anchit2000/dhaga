import { PageHeaderSkeleton, ListSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

/**
 * Was previously an incidental fallback to the Home segment's loading.tsx
 * (Next.js loading.tsx cascades to child routes without their own). Split
 * out so Home's skeleton can go feed-shaped without this route's first
 * paint reflowing to match it.
 */
export default function QuickAddLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label="Loading page" />
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}
