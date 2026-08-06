import type { ReactElement } from "react";
import { RouteLoading } from "@/components/app/RouteLoading";
import { ListSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-3xl">
      <RouteLoading label="Loading tasks">
        <div className="space-y-2">
          <div className="flex gap-2"><Skeleton className="h-11 w-20" /><Skeleton className="h-11 w-28" /></div>
          <div className="flex gap-2"><Skeleton className="h-11 w-14" /><Skeleton className="h-11 w-20" /><Skeleton className="h-11 w-20" /></div>
        </div>
        <ListSkeleton rows={5} />
      </RouteLoading>
    </div>
  );
}
