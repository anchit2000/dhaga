import { Button } from "@/components/ui/button";
import { AiGateNotice } from "@/components/app/AiGateNotice";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { ASK_MESSAGES } from "@/utils/constants/loader-messages";
import type { AskStreamState } from "../useAskStream";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { AskNotice } from "./AskNotice";
import { StepChecklist } from "./StepChecklist";

/**
 * The agentic tab: a metered Sonnet call over the graph, streamed. Reasoning
 * steps tick in as they arrive, then the answer accumulates token-by-token,
 * then the receipts land beneath. Never auto-fired by typing — always an
 * explicit submit (the button submits the palette form, which the stream hook
 * intercepts for "ask" mode).
 */
export function AskPanel({
  state,
  pending,
  hasQuery,
  formId,
  onNavigate,
  aiGate,
}: {
  state: AskStreamState;
  pending: boolean;
  hasQuery: boolean;
  formId: string;
  onNavigate: () => void;
  /** Why Ask Dhaga is greyed out (no AI credits left), or null. Advisory — the
   *  /api/search/ask route still asserts the budget for a stale client. */
  aiGate: string | null;
}) {
  const { steps, answer, notice } = state;

  return (
    <div className="space-y-3">
      {hasQuery ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4">
          <p className="min-w-0 flex-1 text-sm text-fog">
            Get a reasoned answer with receipts, not just matches.
          </p>
          <Button
            type="submit"
            form={formId}
            loading={pending}
            disabled={aiGate !== null}
            className="h-9 shrink-0 px-4 text-sm"
          >
            Ask Dhaga ✦
          </Button>
          {aiGate ? <AiGateNotice reason={aiGate} className="w-full" /> : null}
        </div>
      ) : (
        <p className="px-1 py-8 text-center text-sm text-fog">
          Ask a question about your network for a reasoned answer with receipts.
        </p>
      )}

      {steps.length > 0 ? (
        <StepChecklist steps={steps} pending={pending} answered={answer.length > 0} />
      ) : pending ? (
        // Pre-first-event fallback only: once the first step arrives the
        // live checklist takes over.
        <ThreadLoader messages={ASK_MESSAGES} className="px-1 py-2" />
      ) : null}

      {answer ? <AnswerMarkdown content={answer} /> : null}

      {notice ? (
        <AskNotice
          state={{ notice, kind: state.kind, hits: state.hits }}
          pending={pending}
          formId={formId}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}
