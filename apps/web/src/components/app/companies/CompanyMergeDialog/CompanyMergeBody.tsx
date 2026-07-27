"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeScalarConflicts } from "@dhaga/core";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/app/feedback";
import { loadCompaniesForMergeAction, mergeCompaniesAction } from "@/lib/actions/companies";
import { MERGE_FIELDS, effectiveChoice, resolvedField } from "./fields";
import type { CompanyMergeResolution } from "@dhaga/core";
import type { CompanyMergeRecord } from "@/lib/repo/companies";

/** Loads records for `ids` on mount, then drives the survivor + conflict picks. */
export function CompanyMergeBody({
  ids,
  onClose,
  onMerged,
}: {
  ids: string[];
  onClose: () => void;
  onMerged?: () => void;
}) {
  const router = useRouter();
  const [records, setRecords] = useState<CompanyMergeRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const formData = new FormData();
    formData.set("ids", JSON.stringify(ids));
    loadCompaniesForMergeAction(formData)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.error);
          return;
        }
        const sorted = [...result.data].sort((a, b) => b.contactCount - a.contactCount);
        setRecords(result.data);
        setTargetId(sorted[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load companies — try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const list = records ?? [];
  const loading = records === null && loadError === null;
  const target = list.find((record) => record.id === targetId) ?? null;
  const conflicts = useMemo(() => computeScalarConflicts(records ?? [], MERGE_FIELDS), [records]);
  const resolve = (field: "name" | "domain" | "sector"): string | null => resolvedField(field, conflicts, list, target, choices);

  function submit(): void {
    if (!target || list.length < 2) return;
    setError(null);
    const resolution: CompanyMergeResolution = {
      targetId: target.id,
      sourceIds: list.map((record) => record.id).filter((id) => id !== target.id),
      name: resolve("name") ?? target.name,
      domain: resolve("domain"),
      sector: resolve("sector"),
    };
    startTransition(async () => {
      const formData = new FormData();
      formData.set("resolution", JSON.stringify(resolution));
      const result = await mergeCompaniesAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
      onMerged?.();
      toast.success(`Merged ${list.length} companies.`);
    });
  }

  if (loading) return <><DialogTitle>Merge companies</DialogTitle><p className="py-6 text-center text-sm text-fog">Loading companies…</p></>;
  if (loadError) return <><DialogTitle>Merge companies</DialogTitle><FormError message={loadError} /></>;
  if (list.length < 2) return <><DialogTitle>Merge companies</DialogTitle><p className="py-6 text-center text-sm text-fog">Select at least two companies to merge.</p></>;

  const others = list.length - 1;
  const primaryName = resolve("name") ?? target?.name ?? "the survivor";

  return (
    <>
      <DialogTitle>Merge companies</DialogTitle>
      <DialogDescription>
        The other {others} {others === 1 ? "company" : "companies"} will be merged into this one and
        deleted; all their contacts, positions and relationships move to “{primaryName}”. This can&apos;t
        be undone.
      </DialogDescription>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="merge-primary" className="text-fog">Keep as the primary company</Label>
          <Select id="merge-primary" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {list.map((record) => (
              <option key={record.id} value={record.id}>
                {record.name} — {record.contactCount} {record.contactCount === 1 ? "contact" : "contacts"}
              </option>
            ))}
          </Select>
        </div>
        {conflicts.map((conflict) => (
          <div key={conflict.field} className="space-y-1.5">
            <Label className="text-fog">{conflict.label}</Label>
            <Select value={effectiveChoice(conflict, target, choices)} onChange={(event) => setChoices((current) => ({ ...current, [conflict.field]: event.target.value }))} aria-label={`Choose ${conflict.label}`}>
              {conflict.values.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      <FormError message={error} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button loading={pending} disabled={list.length < 2 || !target} onClick={submit}>
          Merge {list.length} companies
        </Button>
      </DialogFooter>
    </>
  );
}
