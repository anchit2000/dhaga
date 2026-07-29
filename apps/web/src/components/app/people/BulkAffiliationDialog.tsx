"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastError } from "@/components/app/feedback";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { PredicateField } from "@/components/app/relationships/AddRelationshipDialog/PredicateField";
import {
  buildPredicateOptions,
  type PredicateOption,
} from "@/components/app/relationships/AddRelationshipDialog/predicate-options";
import { useRelationshipTypes } from "@/components/app/relationships/AddRelationshipDialog/useRelationshipTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { bulkSetAffiliationAction } from "@/lib/actions/contacts";

type TargetMode = "current" | "company";

/**
 * Relabel how the selected contacts relate to a company — studied at, interned
 * at, worked at, or a custom type — either their current company or a specific
 * one. Only the affiliation label changes; nothing moves a role's company.
 */
export function BulkAffiliationDialog({
  contactIds,
  open,
  onOpenChange,
  onDone,
}: {
  contactIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { customTypes, addType } = useRelationshipTypes(open);
  const [mode, setMode] = useState<TargetMode>("current");
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [predicate, setPredicate] = useState<PredicateOption | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
    if (!next) {
      setMode("current");
      setCompanyQuery("");
      setCompanyId(null);
      setPredicate(null);
    }
  }

  const disabled = !predicate || (mode === "company" && !companyId) || pending;

  function submit(): void {
    if (!predicate || (mode === "company" && !companyId)) return;
    const count = contactIds.length;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactIds", JSON.stringify(contactIds));
      formData.set("relation", predicate.slug);
      formData.set("targetMode", mode);
      if (mode === "company" && companyId) formData.set("companyId", companyId);
      const result = await bulkSetAffiliationAction(formData);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
      onDone?.();
      toast.success(`Set “${predicate.forward}” for ${count} contacts`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Change relationship</DialogTitle>
        <DialogDescription>
          Relabel how {contactIds.length} contacts relate to a company — e.g. studied at, interned
          at, or worked at.
        </DialogDescription>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm text-fog">Which company</legend>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as TargetMode)}
              aria-label="Which company"
              className="grid-cols-1 sm:grid-cols-2"
            >
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2 has-[[data-checked]]:border-amber/50 has-[[data-checked]]:bg-amber/[0.06]">
                <RadioGroupItem value="current" />
                <span className="text-sm text-paper">Their current company</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2 has-[[data-checked]]:border-amber/50 has-[[data-checked]]:bg-amber/[0.06]">
                <RadioGroupItem value="company" />
                <span className="text-sm text-paper">A specific company</span>
              </label>
            </RadioGroup>
            {mode === "company" ? (
              <EntityCombobox
                kinds={["company"]}
                placeholder="Search a company…"
                inputValue={companyQuery}
                onInputValueChange={(value) => {
                  setCompanyQuery(value);
                  setCompanyId(null);
                }}
                onSelect={(target) => {
                  setCompanyQuery(target.label);
                  setCompanyId(target.id);
                }}
                disabled={pending}
              />
            ) : null}
          </fieldset>
          <div className="space-y-1.5">
            <Label className="text-fog">Relationship</Label>
            <PredicateField
              options={buildPredicateOptions(customTypes, "contact", "company")}
              value={predicate}
              onSelect={setPredicate}
              onTypeCreated={addType}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={disabled}>
            Change relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
