"use client";

import { useActionState } from "react";
import { enrichContactAction, type EnrichResult } from "@/lib/actions/enrich";
import { FormError, toastNotice } from "@/components/app/feedback";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { ENRICH_MESSAGES } from "@/utils/constants/loader-messages";
import { AiGateNotice } from "../AiGateNotice";
import { SubmitButton } from "../SubmitButton";

/**
 * User-triggered only (privacy rule: no background lookups). Findings are
 * saved as a note — delete it to remove everything enrichment derived.
 */
export function EnrichButton({
  contactId,
  aiGate,
}: {
  contactId: string;
  /** Why AI is unavailable (no credits left), or null when it is usable. */
  aiGate: string | null;
}) {
  const [state, formAction, pending] = useActionState<EnrichResult, FormData>(
    async (previous, formData) => {
      const result = await enrichContactAction(previous, formData);
      // Transient toast rather than an inline line, which had no lifetime: it
      // sat there promising findings "shortly" long after they'd landed. The
      // Facts panel's status pill carries progress and settles itself.
      if (result.noticed) toastNotice(result.noticed);
      return result;
    },
    {},
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction}>
        <input type="hidden" name="contactId" value={contactId} />
        <SubmitButton className="h-9 px-4 text-sm" disabled={aiGate !== null}>
          Enrich from public web ✦
        </SubmitButton>
      </form>
      {pending ? (
        <ThreadLoader messages={ENRICH_MESSAGES} />
      ) : aiGate ? (
        <AiGateNotice reason={aiGate} className="w-full sm:w-auto sm:flex-1" />
      ) : (
        <p className="text-xs text-fog">
          Searches the public web for their footprint — cited, saved as a note,
          fully deletable.
        </p>
      )}
      <div className="w-full empty:hidden">
        <FormError message={state.error} />
      </div>
    </div>
  );
}
