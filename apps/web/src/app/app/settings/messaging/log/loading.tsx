import { ListSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

/** Own skeleton rather than the Settings segment's: this route is a list of
 *  batches, not the tabbed settings form, so inheriting that fallback would
 *  reflow on first paint. */
export default function CaptureLogLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label="Loading capture log" />
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}
