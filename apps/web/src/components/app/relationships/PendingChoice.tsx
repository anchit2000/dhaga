"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** Submit button for a confirm/dismiss form that shows a spinner in-flight. */
export function PendingChoice({
  children,
  variant = "outline",
}: {
  children: ReactNode;
  variant?: "outline" | "ghost";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "outline"
      ? "border border-seam text-paper hover:bg-wash/[0.04]"
      : "text-fog hover:text-paper";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors disabled:opacity-60 ${styles}`}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {children}
    </button>
  );
}
