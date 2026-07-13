"use client";

import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";

/** Small inline destructive submit for delete/dismiss forms. */
export function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <X className="size-3.5" />
      )}
    </button>
  );
}
