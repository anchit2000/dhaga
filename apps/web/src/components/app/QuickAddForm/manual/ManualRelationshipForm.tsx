"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/app/feedback";
import { createRelationshipAction } from "@/lib/actions/relationships";
import { PredicateField } from "@/components/app/relationships/AddRelationshipDialog/PredicateField";
import { DirectionPreview } from "@/components/app/relationships/AddRelationshipDialog/DirectionPreview";
import { buildPredicateOptions } from "@/components/app/relationships/AddRelationshipDialog/predicate-options";
import { useRelationshipTypes } from "@/components/app/relationships/AddRelationshipDialog/useRelationshipTypes";
import { ContactPickerField } from "./ContactPickerField";
import { buildRelationshipInput, canSubmitRelationship } from "./builders";
import type { PredicateOption } from "@/components/app/relationships/AddRelationshipDialog/predicate-options";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** No-AI person↔person edge: pick two contacts, a predicate (built-in or a
 *  custom type created inline via PredicateField), and a direction — then write
 *  it straight through createRelationshipAction. Unlike AddRelationshipDialog
 *  the subject isn't fixed by a host page, so both endpoints are pickers. */
export function ManualRelationshipForm(): ReactElement {
  const { customTypes, addType } = useRelationshipTypes(true);
  const [subject, setSubject] = useState<GraphTarget | null>(null);
  const [object, setObject] = useState<GraphTarget | null>(null);
  const [predicate, setPredicate] = useState<PredicateOption | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset(): void {
    setSubject(null);
    setObject(null);
    setPredicate(null);
    setFlipped(false);
    setError(null);
  }

  function submit(): void {
    if (!subject || !object || !predicate) return;
    setError(null);
    startTransition(async () => {
      const result = await createRelationshipAction(
        buildRelationshipInput(subject, object, predicate.slug, flipped),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Relationship added.");
      reset();
    });
  }

  return (
    <div className="space-y-4">
      <ContactPickerField label="Subject" value={subject} onSelect={setSubject} placeholder="Search people…" />
      <ContactPickerField label="Connected to" value={object} onSelect={setObject} placeholder="Search people…" />
      <div className="space-y-1.5">
        <Label className="text-fog">Relationship</Label>
        <PredicateField
          options={buildPredicateOptions(customTypes, "contact", "contact")}
          value={predicate}
          onSelect={setPredicate}
          onTypeCreated={addType}
        />
      </div>
      {predicate ? (
        <DirectionPreview
          sourceName={subject?.label ?? "Subject"}
          forward={predicate.forward}
          targetName={object?.label ?? "the other person"}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
        />
      ) : null}
      <FormError message={error} />
      <Button
        onClick={submit}
        loading={pending}
        disabled={!canSubmitRelationship(subject, object, predicate?.slug ?? null)}
        className="w-full sm:w-auto"
      >
        Save relationship
      </Button>
    </div>
  );
}
