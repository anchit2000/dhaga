"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/**
 * Action button for one confirmation choice: runs a server action inside a
 * transition, shows a spinner in-flight, and surfaces failures as a toast. Each
 * button owns its pending state — the repo's status guard makes any double
 * submit a no-op, so the buttons need not disable one another.
 */
export function ConfirmationButton({
  children,
  onRun,
  variant = "outline",
}: {
  children: ReactNode;
  onRun: () => Promise<void>;
  variant?: "outline" | "ghost";
}): React.ReactElement {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await onRun();
          } catch {
            toast.error("Something went wrong. Please try again.");
          }
        })
      }
    >
      {children}
    </Button>
  );
}
