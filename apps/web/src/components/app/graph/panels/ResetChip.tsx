"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Floating exit for isolate mode / path emphasis — always visible while active. */
export function ResetChip({ onReset }: { onReset: () => void }): React.ReactElement {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <Button variant="secondary" size="sm" className="h-9 shadow-lg" onClick={onReset}>
        <RotateCcw aria-hidden />
        Reset view
      </Button>
    </div>
  );
}
