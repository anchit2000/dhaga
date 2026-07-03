import { requireSessionPage } from "@/lib/auth/guard";
import { aiActionsUsedThisMonth, monthlyAiCap } from "@/lib/ai/metering";
import { listSessions } from "@/lib/repo/sessions";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { hasLLM } from "@dhaga/core";

export const metadata = { title: "Quick add — Dhaga" };

/** M2's active-session default: preselect a session started today. */
function activeSessionId(
  sessions: { id: string; startedAt: Date }[],
): string | undefined {
  const today = new Date().toDateString();
  return sessions.find((session) => session.startedAt.toDateString() === today)
    ?.id;
}

export default async function QuickAddPage() {
  await requireSessionPage();
  const [sessions, used] = await Promise.all([
    listSessions(),
    hasLLM() ? aiActionsUsedThisMonth() : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Quick add</h1>
        <p className="mt-1 text-sm text-fog">
          Paste an email signature, card text, or an intro — Dhaga extracts the
          person and keeps the original text as the receipt.
        </p>
        {hasLLM() ? (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-fog/60">
            {used} of {monthlyAiCap()} AI actions used this month
          </p>
        ) : null}
      </div>
      <QuickAddForm
        sessions={sessions.map(({ id, name }) => ({ id, name }))}
        defaultSessionId={activeSessionId(sessions)}
      />
    </div>
  );
}
