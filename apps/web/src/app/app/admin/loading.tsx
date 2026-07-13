import { PageHeaderSkeleton, ListSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

/**
 * Covers admin + all its child routes (users, subscriptions, access
 * requests — none define their own loading.tsx). Was previously an
 * incidental fallback to the Home segment's loading.tsx; split out so
 * Home's skeleton can go feed-shaped without this route reflowing.
 */
export default function AdminLoading() {
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
