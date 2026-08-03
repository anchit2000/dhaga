"use client";

import { useTransition } from "react";
import { EyeOff, UserCheck } from "lucide-react";
import { toastError, toastSuccess } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import { setPersonKindAction } from "@/lib/actions/person-kind";
import { PERSON_KIND_BY, PERSON_KIND_LABELS } from "@/utils/constants/person-kind";
import type { PersonKind } from "@dhaga/core";

/**
 * The appeal route for the person/service classifier, on the contact page.
 *
 * Suppression is only honest if it is visible where the user can see the
 * consequence, so this says three things at once: that the row is kept out of
 * suggestions, WHO decided (Dhaga's guess vs the user's own ruling — a wrong
 * guess should read as Dhaga's, not as a fact about the contact), and that
 * nothing is hidden — the row is still listed, searchable and exportable.
 *
 * It renders NOTHING for an ordinary contact: a chip on every person would be
 * noise, and there is nothing to appeal when no one has ruled anything.
 */
export function PersonKindChip({
  contactId,
  personKind,
  personKindBy,
}: {
  contactId: string;
  personKind: string | null;
  personKindBy: string;
}): React.ReactElement | null {
  const [pending, startTransition] = useTransition();
  const isService = personKind === "service";
  const byUser = personKindBy === PERSON_KIND_BY[1];
  // Only two states carry information: suppressed, or explicitly un-suppressed
  // by the user (which is worth showing so the ruling is visibly reversible).
  if (!isService && !(byUser && personKind === "person")) return null;

  const next: PersonKind = isService ? "person" : "service";
  function overrule(): void {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("kind", next);
      const result = await setPersonKindAction({ ok: true }, formData);
      if (!result.ok) {
        toastError(result.error ?? "Couldn't update — try again.");
        return;
      }
      toastSuccess(
        next === "person"
          ? "Back in suggestions."
          : "Kept out of suggestions — still listed in People.",
      );
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-seam bg-wash/[0.04] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-xs text-fog">
        {isService ? (
          <EyeOff className="size-3.5 shrink-0 text-ember" />
        ) : (
          <UserCheck className="size-3.5 shrink-0 text-ember" />
        )}
        <span className="min-w-0">
          <span className="text-paper">
            {isService ? PERSON_KIND_LABELS.service : "A person"}
          </span>{" "}
          · {isService && !byUser ? PERSON_KIND_LABELS.byModel : PERSON_KIND_LABELS.byUser}
          {isService ? " — kept out of suggestions, still listed everywhere." : "."}
        </span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        loading={pending}
        onClick={overrule}
        aria-label={isService ? "Mark as a person" : "Mark as not a person"}
      >
        {isService ? "Is a person" : PERSON_KIND_LABELS.service}
      </Button>
    </div>
  );
}
