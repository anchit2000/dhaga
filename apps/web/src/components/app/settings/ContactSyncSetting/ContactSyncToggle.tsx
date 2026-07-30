"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ReactElement } from "react";

/**
 * A switch that IS the submit control — the hidden `enabled` field carries the
 * value we are moving to, so the action never reads the switch itself. While in
 * flight it shows the NEW position, disabled, so the row never claims a state
 * the server has not accepted yet. Same shape as the calendar write-out toggle.
 */
export function ContactSyncToggle({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}): ReactElement {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {pending ? <Loader2 className="size-3.5 animate-spin text-fog" /> : null}
      <Switch
        checked={pending ? !enabled : enabled}
        disabled={pending}
        inputRef={inputRef}
        onCheckedChange={(): void => inputRef.current?.form?.requestSubmit()}
        aria-label={label}
        // Widen the built-in hit area to a 44px-tall touch target.
        className="after:-inset-y-3.5"
      />
    </div>
  );
}
