"use client";

import { useFormStatus } from "react-dom";
import { Loader2, RotateCw } from "lucide-react";

/** Small inline submit that re-runs fact extraction on an existing note. Shows
 *  a spinner while the enqueue is in flight; the ExtractionStatus poller then
 *  takes over and surfaces the running job's progress. */
export function ReprocessButton(): React.ReactElement {
  const { pending } = useFormStatus();
  const label = "Re-run fact extraction on this note";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-amber/10 hover:text-amber disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RotateCw className="size-3.5" />
      )}
    </button>
  );
}
