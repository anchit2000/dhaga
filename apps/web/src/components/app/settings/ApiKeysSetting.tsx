"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  type CreateApiKeyState,
} from "@/lib/actions/api-keys";
import { ActionForm } from "@/components/app/ActionForm";
import { FormError } from "@/components/app/feedback";
import { PlanGateNotice } from "@/components/app/PlanGateNotice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format-date";

export interface ApiKeySummary {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: Date;
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-destructive/90 transition-colors hover:text-destructive disabled:pointer-events-none"
    >
      {pending ? <Loader2 className="inline size-3 animate-spin" /> : "Revoke"}
    </button>
  );
}

/** Personal access tokens for non-browser clients (scripts, local MCP clients,
 *  the future mobile app) — replaces the old single shared DHAGA_API_TOKEN.
 *  The browser extension is NOT one of them: it rides the cookie session. */
export function ApiKeysSetting({
  keys,
  createGate,
}: {
  keys: ApiKeySummary[];
  /** Why a new token can't be created (plan), or null when it can. Existing
   *  tokens stay listed and revocable either way — a downgrade must not strip
   *  a working integration, only stop new ones being added. */
  createGate: string | null;
}) {
  const [state, formAction] = useActionState<CreateApiKeyState, FormData>(
    createApiKeyAction,
    {},
  );

  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Personal access tokens</p>
        <p className="mt-1 text-sm text-fog">
          Used by scripts, the mobile app, and local MCP clients to call
          Dhaga&apos;s API as you. Each token is shown once — copy it before you
          leave this page. The browser extension doesn&apos;t need one — it uses
          the session you&apos;re already signed in with.
        </p>
      </div>

      {keys.length > 0 ? (
        <ul className="divide-y divide-seam border-y border-seam text-sm">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-4 py-2.5">
              <div>
                <p className="text-paper">{key.name || "Untitled token"}</p>
                <p className="text-xs text-fog">
                  {key.start ? `${key.start}…` : "········"} · created{" "}
                  {formatDate(key.createdAt)}
                </p>
              </div>
              <ActionForm
                action={deleteApiKeyAction}
                errorMessage="Couldn't revoke that token — try again."
              >
                <input type="hidden" name="keyId" value={key.id} />
                <DeleteSubmit />
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : null}

      {state.key ? (
        <div className="rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm">
          <p className="mb-1 text-ember">
            Copy this now — it won&apos;t be shown again.
          </p>
          <code className="block overflow-x-auto text-xs text-paper">{state.key}</code>
        </div>
      ) : null}

      {/* PlanGateNotice owns the whole "why is this greyed out" affordance —
          hover, keyboard focus and visible text — so this gate and the
          messaging one can never explain the same entitlement differently. */}
      <PlanGateNotice reason={createGate}>
        <form action={formAction} className="flex gap-2">
          <Input
            name="name"
            placeholder="e.g. Mobile app"
            className="h-10"
            disabled={createGate !== null}
          />
          <CreateSubmit gated={createGate !== null} />
        </form>
      </PlanGateNotice>

      <FormError message={state.error} />
    </div>
  );
}

function CreateSubmit({ gated }: { gated: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || gated} className="shrink-0">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Create token
    </Button>
  );
}
