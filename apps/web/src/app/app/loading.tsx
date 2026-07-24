import { HomeBentoSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

export default function AppLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label="Loading page" />
      </div>
      <HomeBentoSkeleton />
    </div>
  );
}
