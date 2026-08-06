"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { CheckIcon } from "@/components/ui/animated-icons";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";

/** Small inline confirm submit for save/edit forms (amber tick).
 *
 *  The tick is driven imperatively from the button rather than the icon's own
 *  hover, so the whole target triggers it, not just the 14px glyph. It is NOT
 *  fired on save success: both callers (FactItem, FollowUpItem) unmount this
 *  form on success (`if (ok) setEditing(false)`), so a success animation would
 *  never be seen — and the only pending→idle transition this component can
 *  observe while still mounted is the FAILURE path, where a tick would lie. */
export function SaveButton({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  const iconRef = useRef<AnimatedIconHandle>(null);
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="flex size-11 items-center justify-center rounded-full text-ember transition-colors hover:bg-amber/15 disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CheckIcon ref={iconRef} size={14} />
      )}
    </button>
  );
}
