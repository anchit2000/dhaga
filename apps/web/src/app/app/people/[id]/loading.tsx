import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/app/skeletons";

export default function PersonLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-48 max-w-[70%]" />
          <Skeleton className="h-4 w-64 max-w-[85%]" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <ListSkeleton rows={3} />
    </div>
  );
}
