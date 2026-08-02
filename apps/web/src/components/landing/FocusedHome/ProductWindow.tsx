import type { ReactElement } from "react";

import { AppWindow } from "@/components/landing/AppWindow";

/** A static, data-free miniature of the real signed-in Home dashboard. */
export function ProductWindow(): ReactElement {
  return (
    <div className="h-52 min-w-0 overflow-hidden rounded-2xl drop-shadow-2xl sm:h-80 lg:h-auto lg:overflow-visible">
      <div className="w-[760px] origin-top-left scale-[0.46] sm:scale-[0.76] lg:w-auto lg:scale-100">
        <AppWindow />
      </div>
    </div>
  );
}
