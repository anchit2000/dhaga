import type { AiCreditGrantRecord } from "@dhaga/ee/admin";
import { ActionForm } from "@/components/app/ActionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { endAiCreditGrantAction } from "@/lib/actions/admin/ai-budget";
import { formatDate } from "@/utils/format-date";
import type { ReactElement } from "react";

/**
 * The audit trail. Every grant keeps who/when/how many/why, and "End now" stops
 * a grant applying WITHOUT deleting the row — the record of the correction is
 * itself part of the record.
 */
export function GrantLedger({ grants }: { grants: AiCreditGrantRecord[] }): ReactElement {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5">
      <div>
        <p className="text-sm font-medium text-paper">Grant ledger</p>
        <p className="mt-1 text-sm text-fog">
          Every grant ever made, newest first. Usage in <code>ai_actions</code> is untouched
          by all of it.
        </p>
      </div>

      {grants.length === 0 ? (
        <p className="text-sm text-fog">No credits have been granted yet.</p>
      ) : (
        <ul className="divide-y divide-seam">
          {grants.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display tabular-nums text-paper">
                    +{grant.credits}
                  </span>
                  <Badge variant="secondary">{grant.userId ?? "everyone"}</Badge>
                  {grant.active ? <Badge>active</Badge> : null}
                </div>
                <p className="mt-1 break-words text-sm text-fog">
                  {grant.reason} — {formatDate(grant.createdAt)}, until{" "}
                  {grant.endsAt ? formatDate(grant.endsAt) : "no expiry"}
                </p>
              </div>
              {grant.active ? (
                <ActionForm action={endAiCreditGrantAction} errorMessage="Couldn't end the grant.">
                  <input type="hidden" name="grantId" value={grant.id} />
                  {grant.userId ? (
                    <input type="hidden" name="userId" value={grant.userId} />
                  ) : null}
                  <Button type="submit" variant="outline" size="sm">
                    End now
                  </Button>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
