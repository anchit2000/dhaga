"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

/** Small inline confirm submit for save/edit forms (amber tick). */
export function SaveButton({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className="rounded-full p-1 text-ember transition-colors hover:bg-amber/15 disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5" />
      )}
    </button>
  );
}
