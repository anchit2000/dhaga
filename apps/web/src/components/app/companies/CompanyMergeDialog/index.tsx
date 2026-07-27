"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CompanyMergeBody } from "./CompanyMergeBody";

/**
 * Per-field merge resolver. The body mounts only while open, loading the full
 * records for the chosen ids on mount. The survivor defaults to the company
 * with the most contacts; each conflicting scalar field offers its competing
 * values, defaulting to the survivor's. Uses `Select` (not raw radios) — the
 * foundation ships no RadioGroup primitive and CLAUDE.md mandates shadcn inputs.
 */
export function CompanyMergeDialog({
  ids,
  open,
  onOpenChange,
  onMerged,
}: {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && ids.length >= 2 ? (
          <CompanyMergeBody ids={ids} onClose={() => onOpenChange(false)} onMerged={onMerged} />
        ) : open ? (
          <>
            <DialogTitle>Merge companies</DialogTitle>
            <p className="py-6 text-center text-sm text-fog">Select at least two companies to merge.</p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
