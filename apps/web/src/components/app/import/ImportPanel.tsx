"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseContactsCsv } from "@/lib/import";
import { importCsvBatchAction } from "@/lib/actions/import";
import { ReviewTable } from "./ReviewTable";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

const BATCH_SIZE = 50;
const FORMAT_LABELS: Record<ImportFormat, string> = {
  google: "Google Contacts",
  linkedin: "LinkedIn Connections",
};

export function ImportPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [format, setFormat] = useState<ImportFormat>("google");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    const result = parseContactsCsv(await file.text());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.candidates.length === 0) {
      toast.error("No importable rows found in that file.");
      return;
    }
    setCandidates(result.candidates);
    setFormat(result.format);
    setSelected(new Set(result.candidates.map((_, index) => index)));
  }

  function selectWhere(predicate: (candidate: ImportCandidate) => boolean): void {
    setSelected(
      new Set(candidates.flatMap((candidate, index) => (predicate(candidate) ? [index] : []))),
    );
  }

  async function runImport(): Promise<void> {
    const picked = [...selected].sort((a, b) => a - b).map((index) => candidates[index]);
    setImporting(true);
    setProgress(0);
    let created = 0;
    let skipped = 0;
    for (let start = 0; start < picked.length; start += BATCH_SIZE) {
      const batch = picked.slice(start, start + BATCH_SIZE);
      const result = await importCsvBatchAction({ format, candidates: batch });
      if ("error" in result) {
        toast.error(result.error);
        setImporting(false);
        return;
      }
      created += result.created;
      skipped += result.skipped;
      setProgress(Math.min(start + BATCH_SIZE, picked.length));
    }
    setImporting(false);
    setCandidates([]);
    toast.success(
      `${created} ${created === 1 ? "person" : "people"} added${
        skipped > 0 ? `, ${skipped} already in your graph` : ""
      }`,
    );
    router.refresh();
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-seam bg-panel p-8 text-center">
        <Upload className="mx-auto size-6 text-ember" />
        <p className="mt-3 text-sm text-paper">
          Google Contacts or LinkedIn Connections CSV
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-fog">
          Parsed in your browser — only the rows you select are uploaded. Every
          imported field keeps a receipt note.
        </p>
        <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>
          Choose CSV file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{FORMAT_LABELS[format]}</Badge>
        <span className="text-xs text-fog">
          {selected.size} of {candidates.length} selected
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => selectWhere(() => true)}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            None
          </Button>
          <Button variant="outline" size="sm" onClick={() => selectWhere((c) => !!c.contact.company)}>
            With company
          </Button>
          <Button variant="outline" size="sm" onClick={() => selectWhere((c) => c.contact.emails.length > 0)}>
            With email
          </Button>
        </span>
      </div>

      <ReviewTable
        candidates={candidates}
        selected={selected}
        onToggle={(index) => {
          const next = new Set(selected);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          setSelected(next);
        }}
      />

      <div className="flex items-center gap-3">
        <Button disabled={importing || selected.size === 0} onClick={() => void runImport()}>
          {importing ? <Loader2 className="size-4 animate-spin" /> : null}
          {importing
            ? `Importing ${progress}/${selected.size}…`
            : `Import ${selected.size} selected`}
        </Button>
        <Button variant="outline" disabled={importing} onClick={() => setCandidates([])}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
