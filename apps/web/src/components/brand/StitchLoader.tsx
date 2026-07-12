import { cn } from "@/lib/utils";

interface StitchLoaderProps {
  className?: string;
  label?: string;
}

/** A restrained, brand-native progress mark for waits longer than a click. */
export function StitchLoader({
  className,
  label = "Loading",
}: StitchLoaderProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-fog", className)}
      role="status"
      aria-live="polite"
    >
      <span className="dhaga-stitch" aria-hidden="true">
        <span />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
