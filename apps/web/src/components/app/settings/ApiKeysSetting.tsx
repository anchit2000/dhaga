"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  type CreateApiKeyState,
} from "@/lib/actions/api-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      className="text-xs text-red-400/90 transition-colors hover:text-red-400 disabled:pointer-events-none"
    >
      {pending ? <Loader2 className="inline size-3 animate-spin" /> : "Revoke"}
    </button>
  );
}

/** Personal access tokens for non-browser clients (extension, scripts, the
 *  future mobile app) — replaces the old single shared DHAGA_API_TOKEN. */
export function ApiKeysSetting({ keys }: { keys: ApiKeySummary[] }) {
  const [state, formAction] = useActionState<CreateApiKeyState, FormData>(
    createApiKeyAction,
    {},
  );

  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Personal access tokens</p>
        <p className="mt-1 text-sm text-fog">
          Used by the browser extension and scripts to call Dhaga&apos;s API
          as you. Each token is shown once — copy it before you leave this
          page.
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
                  {key.createdAt.toLocaleDateString()}
                </p>
              </div>
              <form action={deleteApiKeyAction}>
                <input type="hidden" name="keyId" value={key.id} />
                <DeleteSubmit />
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {state.key ? (
        <div className="rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm">
          <p className="mb-1 text-amber">
            Copy this now — it won&apos;t be shown again.
          </p>
          <code className="block overflow-x-auto text-xs text-paper">{state.key}</code>
        </div>
      ) : null}

      <form action={formAction} className="flex gap-2">
        <Input
          name="name"
          placeholder="e.g. Browser extension"
          className="h-10"
        />
        <CreateSubmit />
      </form>
    </div>
  );
}

function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Create token
    </Button>
  );
}
