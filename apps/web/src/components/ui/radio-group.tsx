"use client"

import type { ReactNode } from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

interface RadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
  children?: ReactNode
}

function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
  "aria-label": ariaLabel,
  children,
}: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as string)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("grid gap-2", className)}
    >
      {children}
    </RadioGroupPrimitive>
  )
}

interface RadioGroupItemProps {
  value: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

function RadioGroupItem({ value, disabled, className, "aria-label": ariaLabel }: RadioGroupItemProps) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border border-input outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-primary" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
