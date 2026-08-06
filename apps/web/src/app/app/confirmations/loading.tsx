import type { ReactElement } from "react";

import { RouteLoading } from "@/components/app/RouteLoading";
import { ListSkeleton } from "@/components/app/skeletons";

export default function ConfirmationsLoading(): ReactElement {
  return (
    <RouteLoading label="Loading confirmations">
      <ListSkeleton rows={4} />
    </RouteLoading>
  );
}
