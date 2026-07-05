import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** No-op subscribe for useSyncExternalStore when a value is read once and never changes after mount (e.g. browser feature detection) — avoids a hydration-mismatching setState-in-effect. */
export const noSubscription = () => () => {}
