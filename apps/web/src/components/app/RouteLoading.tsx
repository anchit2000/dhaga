import type { ReactElement, ReactNode } from "react";

import { PageHeaderSkeleton } from "@/components/app/skeletons";
import { StitchLoader } from "@/components/brand/StitchLoader";

interface RouteLoadingProps {
  children: ReactNode;
  label: string;
}

/** A lightweight streamed fallback that keeps the app shell responsive while
 * each route supplies skeletons matching its final content shape. */
export function RouteLoading({ children, label }: RouteLoadingProps): ReactElement {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="flex items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <StitchLoader label={label} />
      </div>
      {children}
    </div>
  );
}
