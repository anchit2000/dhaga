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
      tone="intelligence"
      viewAll={{
        href: "/app/confirmations",
        label: confirmations.length > preview.length ? `Review all ${confirmations.length}` : "Review",
      }}
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
          const claim = "options" in item.payload ? item.payload.options[0] : undefined;
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
    </HomeTile>
  );
}
