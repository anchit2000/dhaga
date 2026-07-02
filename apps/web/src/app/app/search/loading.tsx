import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/app/skeletons";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
