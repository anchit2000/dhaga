import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeTile } from "./HomeTile";
import type { ConfirmationView } from "@/lib/repo/confirmations";

const PREVIEW_LIMIT = 3;

/**
 * Home's compact window onto the confirmations inbox: the count plus the first
 * few questions, and a link through to /app/confirmations to act on them.
 * Renders nothing when the inbox is empty — this is an alert tile, not a fixture.
 */
export function ConfirmationsPreview({
  confirmations,
}: {
  confirmations: ConfirmationView[];
}): React.ReactElement | null {
  if (confirmations.length === 0) return null;
  const preview = confirmations.slice(0, PREVIEW_LIMIT);

  return (
    <HomeTile
      title="To confirm"
      tone="amber"
      meta={
        <span className="font-mono text-[10px] uppercase tracking-widest text-ember">
          {confirmations.length} pending
        </span>
      }
    >
      <ul className="space-y-2.5">
        {preview.map((item) => {
          // The web-sourced claim lives in `options` (label = the fact/claim,
          // sublabel = its type); show it so the user can actually judge it.
          // Legacy rows with no options fall back to the generic question.
          const claim = item.payload.options[0];
          return (
            <li key={item.id} className="flex flex-col gap-0.5">
              {item.contactName ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-fog">
                  {item.contactName}
                </span>
              ) : null}
              {claim ? (
                <span className="line-clamp-2 text-sm text-paper">
                  {claim.label}
                  {claim.sublabel ? (
                    <span className="text-xs text-fog"> · {claim.sublabel}</span>
                  ) : null}
                </span>
              ) : (
                <span className="line-clamp-2 text-sm text-paper">{item.payload.question}</span>
              )}
            </li>
          );
        })}
      </ul>
      <Link
        href="/app/confirmations"
        className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs text-ember underline-offset-2 hover:underline"
      >
        {confirmations.length > preview.length
          ? `See all ${confirmations.length}`
          : "Review"}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </HomeTile>
  );
}
