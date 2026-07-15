"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App-shell error boundary. Before this, a thrown server action or a timed-out
 * request had nowhere to land and the whole page fell over until a manual
 * reload. Now the rest of the shell survives and the user gets a clean retry.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side only (never server logs, per the privacy rule); errors here
    // are render/action failures, not contact data.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="font-display text-xl tracking-tight">Something went sideways</h1>
      <p className="text-sm text-fog">
        This page hit an error. Your data is safe — nothing was lost. Try again.
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        <RotateCw />
        Try again
      </Button>
    </div>
  );
}
