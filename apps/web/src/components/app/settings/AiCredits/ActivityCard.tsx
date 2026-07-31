import { AI_ACTIVITY_LIMIT } from "@/utils/constants/ai-credits";
import { formatRelativeTime } from "@/utils/format-date";
import { creditsLabel } from "./format";
import type { AiCreditActivityRow } from "@/types";

/**
 * The last few AI actions, in the words the user would use for them: "Card scan
 * · 1 credit · 2 hours ago". Never a feature id, never a token count — tokens
 * are how we priced the credit, not something the user spent.
 *
 * Bounded to AI_ACTIVITY_LIMIT rows: `ai_actions` is append-only and never
 * pruned, so an unbounded list would grow without limit for the life of the
 * account. The month's accounting lives in the breakdown above.
 */
export function ActivityCard({ rows }: { rows: AiCreditActivityRow[] }) {
  const now = new Date();
  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Recent activity</h2>
        <p className="mt-1 text-sm text-fog">
          Your last {AI_ACTIVITY_LIMIT} AI actions, newest first.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-fog">Nothing yet — no AI action has run on this account.</p>
      ) : (
        <ul className="divide-y divide-seam border-t border-seam">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5">
              <span className="min-w-0 text-sm text-paper">{row.label}</span>
              <span className="text-xs text-fog">
                · {row.free ? "Free" : creditsLabel(row.credits)} ·{" "}
                {formatRelativeTime(row.at, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
