"use client";

import { useTransition } from "react";
import { toastActionError } from "@/components/app/feedback";
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
  className,
}: {
  children: ReactNode;
  onRun: () => Promise<void>;
  variant?: "outline" | "ghost";
  className?: string;
}): React.ReactElement {
  const [pending, startTransition] = useTransition();
  function run(): void {
    startTransition(async () => {
      try {
        await onRun();
      } catch (error) {
        toastActionError(error, "Something went wrong. Please try again.", run);
      }
    });
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={className}
      loading={pending}
      onClick={run}
    >
      {children}
    </Button>
  );
}
