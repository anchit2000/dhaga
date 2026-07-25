import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AskAiState } from "@/lib/actions/search";

/**
 * A degraded / failed Ask result, styled by kind so the user can tell a plan
 * limit from a transient blip from a real error. Amber for the recoverable
 * cases (upgrade nudge, retry), red only for a genuine AI failure, plain fog
 * for neutral info. The Retry button submits the palette form, which re-runs
 * the stream.
 */
export function AskNotice({
  state,
  pending,
  formId,
  onNavigate,
}: {
  state: AskAiState;
  pending: boolean;
  formId: string;
  onNavigate: () => void;
}) {
  const notice = state.notice ?? "";

  if (state.kind === "upgrade") {
    return (
      <div className="space-y-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fog">{notice}</p>
          <Link
            href="/app/settings"
            onClick={onNavigate}
            className="shrink-0 text-sm font-medium text-amber hover:underline"
          >
            Upgrade
          </Link>
        </div>
        {state.hits && state.hits.length > 0 ? (
          <ul className="space-y-1.5">
            {state.hits.slice(0, 5).map((hit) => (
              <li key={hit.id}>
                <Link
                  href={`/app/people/${hit.id}`}
                  onClick={onNavigate}
                  className="block truncate rounded-lg border border-seam bg-panel px-3 py-2 text-sm text-paper transition-colors hover:bg-wash/[0.03]"
                >
                  {hit.label}
                  {hit.sublabel ? (
                    <span className="text-fog">{` · ${hit.sublabel}`}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-fog">Open the Search tab for keyword matches.</p>
        )}
      </div>
    );
  }

  if (state.kind === "retry" || state.kind === "error") {
    const isError = state.kind === "error";
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
          isError ? "border-red-400/30 bg-red-400/[0.06]" : "border-amber/25 bg-amber/[0.05]"
        }`}
      >
        <p className={`text-sm ${isError ? "text-red-300" : "text-fog"}`}>{notice}</p>
        <Button
          type="submit"
          form={formId}
          loading={pending}
          variant="outline"
          className="h-9 shrink-0 px-4 text-sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  return <p className="text-sm text-fog">{notice}</p>;
}
