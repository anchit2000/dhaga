"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LINKEDIN_EXPORT_URL } from "@/utils/constants/linkedin";
import { startLinkedinExportReminderAction } from "@/lib/actions/linkedin-reminders";
import { ImportInstructions } from "./ImportInstructions";
import { ProviderConnect } from "./ProviderConnect";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

interface ImportDropzoneProps {
  onFile: (file: File | undefined) => void;
  onCandidates: (candidates: ImportCandidate[], format: ImportFormat) => void;
}

/** Import empty state: connect an OAuth account, or drop a CSV / vCard file. */
export function ImportDropzone({ onFile, onCandidates }: ImportDropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div
      data-tour="import"
      className="rounded-2xl border border-dashed border-seam bg-panel p-8 text-center"
    >
      <ProviderConnect onCandidates={onCandidates} />
      <Upload className="mx-auto size-6 text-ember" />
      <p className="mt-3 text-sm text-paper">
        Apple, Android, or iCloud contacts (.vcf) — or a Google / LinkedIn CSV
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-fog">
        Parsed in your browser — only the rows you select are uploaded. Every
        imported field keeps a receipt note.
      </p>
      <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>
        Choose file
      </Button>
      <Button
        className="mt-4 ml-2"
        variant="outline"
        size="sm"
        onClick={() => {
          window.open(LINKEDIN_EXPORT_URL, "_blank", "noopener,noreferrer");
          void startLinkedinExportReminderAction();
          toast.success(
            "Opening LinkedIn — request your Connections archive. We'll remind you to upload it here once it arrives (usually within a day).",
          );
        }}
      >
        {/* Inline LinkedIn glyph: this pinned lucide-react (v1.x) dropped all
            brand icons, so there's no <Linkedin /> to import. */}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
        </svg>
        Get contacts from LinkedIn
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <ImportInstructions />
    </div>
  );
}
