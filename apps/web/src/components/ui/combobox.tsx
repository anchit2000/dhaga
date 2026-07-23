"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";

import { cn } from "@/lib/utils";

/**
 * Searchable combobox — the value-picker counterpart to the native `Select` and
 * the `DropdownMenu` menu, built on Base UI (the repo's primitive library) so it
 * matches their portal/positioner/keyboard behaviour rather than pulling in a
 * second primitive stack. Set `filter={null}` on the root for server-driven
 * results (the list already came back filtered); leave it default for local
 * filtering. See `EntityCombobox` for the graph-target-backed composition.
 */
const Combobox = ComboboxPrimitive.Root;
const ComboboxTrigger = ComboboxPrimitive.Trigger;
const ComboboxList = ComboboxPrimitive.List;

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "z-50 max-h-(--available-height) w-[min(var(--available-width),max(var(--anchor-width),15rem))] origin-(--transform-origin) overflow-y-auto rounded-xl border border-seam bg-panel py-1 text-paper shadow-lg ring-1 ring-foreground/5 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex min-h-11 cursor-default select-none items-center gap-2 px-3 py-2 text-sm text-paper outline-none data-highlighted:bg-wash/[0.06] data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-3 py-6 text-center text-sm text-fog", className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
};
