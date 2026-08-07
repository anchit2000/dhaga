"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

/**
 * Hover/focus hint anchored to a trigger — built on Base UI (the repo's
 * primitive library) so its portal, positioner and keyboard behaviour match
 * `Popover` and `DropdownMenu` rather than pulling in a second primitive stack.
 *
 * Base UI opens on pointer hover AND on keyboard focus, which is the whole
 * reason to use it over a native `title`. It does NOT open on touch — a tooltip
 * can therefore never be the only place a message lives (see `PlanGateNotice`,
 * which always renders the same text visibly as well).
 *
 * Pass `render` to `TooltipTrigger` to anchor an existing element; wrap a
 * DISABLED control in a `render={<div tabIndex={0} />}` trigger, because a
 * disabled control is `pointer-events-none` and unfocusable and so can never
 * fire the hint itself.
 */
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  align = "center",
  side = "top",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) rounded-lg border border-seam bg-panel px-3 py-2 text-xs leading-relaxed text-paper shadow-lg ring-1 ring-foreground/5 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };
