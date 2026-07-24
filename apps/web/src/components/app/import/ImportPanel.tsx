"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isVcard, parseContactsCsv, parseContactsVcard } from "@/lib/import";
import { importCsvBatchAction } from "@/lib/actions/import";
import { ImportDropzone } from "./ImportDropzone";
import { ImportReview } from "./ImportReview";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

const BATCH_SIZE = 200;
const LARGE_FILE_BYTES = 40 * 1024 * 1024;
const LARGE_COUNT = 20_000;

export function ImportPanel() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [format, setFormat] = useState<ImportFormat>("google");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  function applyCandidates(next: ImportCandidate[], nextFormat: ImportFormat): void {
    setCandidates(next);
    setFormat(nextFormat);
    setSelected(new Set(next.map((_, index) => index)));
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > LARGE_FILE_BYTES) {
      toast.warning(
        "This file is very large — import may be slow; consider splitting it into smaller .vcf files.",
      );
    }
    const text = await file.text();
    const result =
      file.name.toLowerCase().endsWith(".vcf") || isVcard(text)
        ? parseContactsVcard(text)
        : parseContactsCsv(text);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.candidates.length === 0) {
      toast.error("No importable rows found in that file.");
      return;
    }
    if (result.candidates.length > LARGE_COUNT) {
      toast.info(
        `Parsed ${result.candidates.length.toLocaleString()} contacts — a large import may take a while.`,
      );
    }
    applyCandidates(result.candidates, result.format);
  }

  function selectWhere(predicate: (candidate: ImportCandidate) => boolean): void {
    setSelected(
      new Set(candidates.flatMap((candidate, index) => (predicate(candidate) ? [index] : []))),
    );
  }

  function toggle(index: number): void {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
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
      <ImportDropzone onFile={(file) => void handleFile(file)} onCandidates={applyCandidates} />
    );
  }

  return (
    <ImportReview
      candidates={candidates}
      format={format}
      selected={selected}
      importing={importing}
      progress={progress}
      onSelectWhere={selectWhere}
      onClear={() => setSelected(new Set())}
      onToggle={toggle}
      onImport={() => void runImport()}
      onCancel={() => setCandidates([])}
    />
  );
}
