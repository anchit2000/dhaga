"use client";

import { Loader2 } from "lucide-react";
import { primaryPosition } from "@dhaga/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewTable } from "./ReviewTable";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

const FORMAT_LABELS: Record<ImportFormat, string> = {
  google: "Google Contacts",
  linkedin: "LinkedIn Connections",
  vcard: "vCard (Apple / Android / iCloud)",
  microsoft: "Outlook / Hotmail",
  device: "Device contacts",
};

interface ImportReviewProps {
  candidates: ImportCandidate[];
  format: ImportFormat;
  selected: Set<number>;
  importing: boolean;
  progress: number;
  onSelectWhere: (predicate: (candidate: ImportCandidate) => boolean) => void;
  onClear: () => void;
  onToggle: (index: number) => void;
  onImport: () => void;
  onCancel: () => void;
}

/** Populated import view: format badge, quick-select filters, review table, run/cancel. */
export function ImportReview({
  candidates,
  format,
  selected,
  importing,
  progress,
  onSelectWhere,
  onClear,
  onToggle,
  onImport,
  onCancel,
}: ImportReviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{FORMAT_LABELS[format]}</Badge>
        <span className="text-xs text-fog">
          {selected.size} of {candidates.length} selected
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => onSelectWhere(() => true)}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            None
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelectWhere((c) => !!primaryPosition(c.contact.positions)?.company)}>
            With company
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelectWhere((c) => c.contact.emails.length > 0)}>
            With email
          </Button>
        </span>
      </div>

      <ReviewTable candidates={candidates} selected={selected} onToggle={onToggle} />

      <div className="flex items-center gap-3">
        <Button disabled={importing || selected.size === 0} onClick={onImport}>
          {importing ? <Loader2 className="size-4 animate-spin" /> : null}
          {importing ? `Importing ${progress}/${selected.size}…` : `Import ${selected.size} selected`}
        </Button>
        <Button variant="outline" disabled={importing} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
