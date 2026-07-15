import { Button } from "@/components/ui/button";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { ASK_MESSAGES } from "@/utils/constants/loader-messages";
import type { AskAiState } from "@/lib/actions/search";

/**
 * The agentic tab: a metered Sonnet call over the graph, reasoned with
 * receipts. Never auto-fired by typing — always an explicit submit.
 */
export function AskPanel({
  state,
  pending,
  hasQuery,
  formId,
}: {
  state: AskAiState;
  pending: boolean;
  hasQuery: boolean;
  formId: string;
}) {
  return (
    <div className="space-y-3">
      {hasQuery ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4">
          <p className="text-sm text-fog">
            Get a reasoned answer with receipts, not just matches.
          </p>
          <Button
            type="submit"
            form={formId}
            loading={pending}
            className="h-9 shrink-0 px-4 text-sm"
          >
            Ask Dhaga ✦
          </Button>
        </div>
      ) : (
        <p className="px-1 py-8 text-center text-sm text-fog">
          Ask a question about your network for a reasoned answer with receipts.
        </p>
      )}

      {pending ? (
        <ThreadLoader messages={ASK_MESSAGES} className="px-1 py-2" />
      ) : state.answer ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">
          {state.answer}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
    </div>
  );
}
