import { ListSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function EntityLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-48 max-w-[70%]" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
