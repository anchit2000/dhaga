"use client";

import { useActionState } from "react";
import { enrichContactAction, type EnrichResult } from "@/lib/actions/enrich";
import { FormError } from "@/components/app/feedback";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { ENRICH_MESSAGES } from "@/utils/constants/loader-messages";
import { SubmitButton } from "../SubmitButton";

/**
 * User-triggered only (privacy rule: no background lookups). Findings are
 * saved as a note — delete it to remove everything enrichment derived.
 */
export function EnrichButton({ contactId }: { contactId: string }) {
  const [state, formAction, pending] = useActionState<EnrichResult, FormData>(
    enrichContactAction,
    {},
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction}>
        <input type="hidden" name="contactId" value={contactId} />
        <SubmitButton className="h-9 px-4 text-sm">
          Enrich from public web ✦
        </SubmitButton>
      </form>
      {pending ? (
        <ThreadLoader messages={ENRICH_MESSAGES} />
      ) : (
        <p className="text-xs text-fog">
          Searches the public web for their footprint — cited, saved as a note,
          fully deletable.
        </p>
      )}
      {state.noticed ? (
        <p className="w-full text-xs text-ember" role="status">
          {state.noticed}
        </p>
      ) : null}
      <div className="w-full empty:hidden">
        <FormError message={state.error} />
      </div>
    </div>
  );
}
