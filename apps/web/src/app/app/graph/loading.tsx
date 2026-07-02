import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/app/skeletons";

export default function GraphLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-[70vh] w-full rounded-2xl" />
    </div>
  );
}
