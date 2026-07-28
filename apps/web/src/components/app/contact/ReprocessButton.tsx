"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { RotateCWIcon } from "@/components/ui/animated-icons";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";

/** Small inline submit that re-runs fact extraction on an existing note. Shows
 *  a spinner while the enqueue is in flight; the ExtractionStatus stream then
 *  takes over and surfaces the running job's progress. The idle icon nudges
 *  clockwise on hover, driven from the button so the whole target triggers it. */
export function ReprocessButton(): React.ReactElement {
  const { pending } = useFormStatus();
  const iconRef = useRef<AnimatedIconHandle>(null);
  const label = "Re-run fact extraction on this note";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="rounded-full p-1 text-fog transition-colors hover:bg-amber/10 hover:text-ember disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RotateCWIcon ref={iconRef} size={14} />
      )}
    </button>
  );
}
