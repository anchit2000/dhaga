import type { ReactElement } from "react";

import { RouteLoading } from "@/components/app/RouteLoading";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading(): ReactElement {
  return (
    <RouteLoading label="Loading calendar">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-36 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[62vh] min-h-96 w-full rounded-2xl" />
    </RouteLoading>
  );
}
