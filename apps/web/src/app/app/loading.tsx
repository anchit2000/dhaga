import { ActivityFeedSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

/** Home only — other /app/* routes have their own loading.tsx now so they
 *  don't inherit this feed-shaped skeleton. */
export default function AppLoading() {
  return (
    <div className="space-y-8 pb-16" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label="Loading page" />
      </div>
      <ActivityFeedSkeleton />
    </div>
  );
}
