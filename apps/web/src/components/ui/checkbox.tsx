"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Mixed visual state for a header "some but not all selected" checkbox. */
  indeterminate?: boolean
  className?: string
  "aria-label"?: string
  /** Uncontrolled use in a plain `<form action>` — Base UI renders a hidden
   *  native input under this name so the checked state shows up in FormData. */
  name?: string
  defaultChecked?: boolean
  id?: string
}

function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  indeterminate = false,
  className,
  "aria-label": ariaLabel,
  name,
  defaultChecked,
  id,
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      id={id}
      checked={checked}
      defaultChecked={defaultChecked}
      indeterminate={indeterminate}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      aria-label={ariaLabel}
      name={name}
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-on-accent outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
