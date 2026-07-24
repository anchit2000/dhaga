"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-2xl border border-dashed border-seam bg-panel p-8 text-center">
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
