"use client";

import { Loader2 } from "lucide-react";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";

/** An email-preference switch that flips instantly (useOptimisticToggle) and
 *  reverts with a toast if the write fails — never the full-page error boundary. */
export function DigestToggle({
  enabled,
  action,
  label,
  title,
  description,
}: {
  enabled: boolean;
  action: (formData: FormData) => Promise<void>;
  label: string;
  title: string;
  description: string;
}) {
  const { value, pending, set } = useOptimisticToggle<boolean>({
    value: enabled,
    mutate: async (next) => {
      const formData = new FormData();
      formData.set("enabled", next ? "on" : "off");
      await action(formData);
    },
    errorMessage: `Couldn't update ${label.toLowerCase()} — try again.`,
  });
  return (
    <div className="flex items-start justify-between gap-4 border-t border-seam pt-4">
      <div>
        <p className="text-sm font-medium text-paper">{title}</p>
        <p className="mt-1 text-sm text-fog">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={pending}
        onClick={() => set(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
          value ? "border-amber/50 bg-amber/30" : "border-seam bg-wash/[0.06]"
        }`}
      >
        <span
          className={`absolute top-0.5 flex size-5.5 items-center justify-center rounded-full transition-all ${
            value ? "left-6 bg-amber" : "left-0.5 bg-fog/60"
          }`}
        >
          {pending ? <Loader2 className="size-3 animate-spin text-on-accent" /> : null}
        </span>
      </button>
    </div>
  );
}
