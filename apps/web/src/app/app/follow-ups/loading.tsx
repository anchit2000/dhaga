import type { ReactElement } from "react";

import { RouteLoading } from "@/components/app/RouteLoading";
import { ListSkeleton } from "@/components/app/skeletons";

export default function FollowUpsLoading(): ReactElement {
  return (
    <RouteLoading label="Loading follow-ups">
      <ListSkeleton />
    </RouteLoading>
  );
}
