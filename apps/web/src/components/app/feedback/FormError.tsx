"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";

/**
 * The ONE dismissible inline error for forms — replaces the ad-hoc
 * `<p className="text-sm text-red-400" role="alert">{state.error}</p>` scattered
 * across every form so a save failure looks identical everywhere (the app ships
 * no shadcn <Alert>). Pairs with useActionState: pass `state.error`. Renders
 * nothing when there's no message. Dismiss is per-message: a NEW (different)
 * error re-shows even after a previous one was dismissed, so the user is never
 * left staring at a stale-but-dismissed error while a fresh failure is hidden.
 */
export function FormError({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}): React.ReactElement | null {
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!message || message === dismissed) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-400"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium underline underline-offset-2 hover:text-paper"
        >
          Retry
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(message)}
        className="shrink-0 text-red-400/70 transition-colors hover:text-red-400"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
