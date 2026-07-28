"use client";

import { cn } from "@/lib/utils";
import { scorePassword } from "@/lib/auth/password-strength";

interface PasswordStrengthMeterProps {
  password: string;
}

// Restrained palette: red flags a weak choice (the same red the auth forms
// already use for errors), amber — the one brand accent — carries fair/strong.
// No third colour is introduced; strength reads from the filled-segment count.
const FILL_CLASS = {
  weak: "bg-destructive/80",
  fair: "bg-amber",
  strong: "bg-amber",
} as const;

const SEGMENTS = [0, 1, 2, 3];

/** Advisory strength bar shown under a new-password field. Empty input renders nothing. */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, level, label } = scorePassword(password);
  if (password.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {SEGMENTS.map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? FILL_CLASS[level] : "bg-seam",
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", level === "weak" ? "text-destructive" : "text-fog")}>
        {label} password
      </p>
    </div>
  );
}
