import type { ReactElement } from "react";

import { RouteLoading } from "@/components/app/RouteLoading";
import { ListSkeleton } from "@/components/app/skeletons";

export default function CompaniesLoading(): ReactElement {
  return (
    <RouteLoading label="Loading companies">
      <ListSkeleton />
    </RouteLoading>
  );
}
