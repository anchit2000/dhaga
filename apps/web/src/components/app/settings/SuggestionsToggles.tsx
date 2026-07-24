"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Save
    </Button>
  );
}

export function PrefToggle({ enabled, label }: { enabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
        enabled ? "border-amber/50 bg-amber/30" : "border-seam bg-wash/[0.06]"
      }`}
    >
      <span
        className={`absolute top-0.5 flex size-5.5 items-center justify-center rounded-full transition-all ${
          enabled ? "left-6 bg-amber" : "left-0.5 bg-fog/60"
        }`}
      >
        {pending ? <Loader2 className="size-3 animate-spin text-on-accent" /> : null}
      </span>
    </button>
  );
}
