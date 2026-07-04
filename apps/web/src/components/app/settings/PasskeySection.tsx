"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function PasskeySection() {
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function addPasskey(): Promise<void> {
    setBusy(true);
    setError(undefined);
    const { error: addError } = await authClient.passkey.addPasskey();
    setBusy(false);
    if (addError) setError(addError.message ?? "Couldn't add a passkey.");
  }

  async function removePasskey(id: string): Promise<void> {
    setBusy(true);
    setError(undefined);
    const { error: deleteError } = await authClient.passkey.deletePasskey({ id });
    setBusy(false);
    if (deleteError) setError(deleteError.message ?? "Couldn't remove that passkey.");
  }

  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <p className="text-sm text-paper">Passkeys</p>
      {isPending ? (
        <p className="text-sm text-fog">Loading…</p>
      ) : passkeys && passkeys.length > 0 ? (
        <ul className="space-y-2">
          {passkeys.map((key) => (
            <li key={key.id} className="flex items-center justify-between text-sm text-fog">
              <span>{key.name ?? "Passkey"}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removePasskey(key.id)}
                aria-label="Remove passkey"
                className="text-fog hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fog">No passkeys yet.</p>
      )}
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={addPasskey}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add a passkey
      </Button>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
