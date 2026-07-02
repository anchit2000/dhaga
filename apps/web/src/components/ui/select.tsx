import * as React from "react";

import { cn } from "@/lib/utils";

/** Styled native select — sufficient until richer dropdowns are needed. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-10 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30 [&>option]:bg-panel [&>option]:text-paper",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
