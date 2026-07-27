"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadContactsForMergeAction, mergeContactsAction } from "@/lib/actions/contacts";
import type { ContactMergeRecord } from "@/lib/repo/contacts";
import { MergeResolver } from "./MergeResolver";
import { buildResolution, defaultChoices } from "./resolution";

/**
 * Fold several contacts into one. Opened from both the People bulk bar and the
 * duplicates page, so it takes the ids to merge and loads their details itself.
 */
export function ContactMergeDialog({
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
  const router = useRouter();
  const idsKey = ids.join(",");
  // Loaded data + errors are keyed to the ids so a stale load never shows for a
  // new selection, and no synchronous state reset is needed inside the effect.
  const [loaded, setLoaded] = useState<{ key: string; records: ContactMergeRecord[] } | null>(null);
  const [errored, setErrored] = useState<{ key: string; message: string } | null>(null);
  const [targetId, setTargetId] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const records = loaded?.key === idsKey ? loaded.records : null;
  const loadError = errored?.key === idsKey ? errored.message : null;

  useEffect(() => {
    if (!open || ids.length === 0 || records || loadError) return;
    let active = true;
    const formData = new FormData();
    formData.set("ids", JSON.stringify(ids));
    void loadContactsForMergeAction(formData).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setErrored({ key: idsKey, message: result.error });
        return;
      }
      setLoaded({ key: idsKey, records: result.data });
      const primary = result.data[0]?.id ?? "";
      setTargetId(primary);
      setChoices(defaultChoices(result.data, primary));
    });
    return () => {
      active = false;
    };
  }, [open, ids, idsKey, records, loadError]);

  function pickTarget(id: string): void {
    setTargetId(id);
    if (records) setChoices(defaultChoices(records, id));
  }

  function submit(): void {
    if (!records) return;
    const resolution = buildResolution(records, targetId, choices);
    if (!resolution) return;
    const count = records.length;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("resolution", JSON.stringify(resolution));
      const result = await mergeContactsAction(formData);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
      onMerged?.();
      toast.success(`Merged ${count} contacts`);
    });
  }

  const canMerge = !!records && records.length >= 2 && !pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Merge contacts</DialogTitle>
        <DialogDescription>
          The other contacts will be merged in and then deleted. This can&apos;t be undone.
        </DialogDescription>

        {loadError ? (
          <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
        ) : !records ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-fog">
            <Loader2 className="size-4 animate-spin" /> Loading contacts…
          </div>
        ) : records.length < 2 ? (
          <p className="py-8 text-center text-sm text-fog">Select at least 2 contacts to merge.</p>
        ) : (
          <MergeResolver
            records={records}
            targetId={targetId}
            onTargetChange={pickTarget}
            choices={choices}
            onChoiceChange={(field, value) =>
              setChoices((current) => ({ ...current, [field]: value }))
            }
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={!canMerge}>
            {records && records.length >= 2 ? `Merge ${records.length} contacts` : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
