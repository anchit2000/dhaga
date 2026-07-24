import type { ReactNode } from "react";

/**
 * Shared chrome for one confirmation: the subject line (the contact the row is
 * about, when known) and the question the extractor is asking, above the
 * type-specific choices passed as children.
 */
export function ConfirmationCardShell({
  question,
  contactName,
  children,
}: {
  question: string;
  contactName: string | null;
  children: ReactNode;
}): React.ReactElement {
  return (
    <li className="space-y-3 rounded-xl border border-seam bg-wash/[0.03] p-3.5">
      <div className="space-y-1">
        {contactName ? (
          <p className="font-mono text-[10px] uppercase tracking-wider text-fog">
            {contactName}
          </p>
        ) : null}
        <p className="text-sm text-paper">{question}</p>
      </div>
      {children}
    </li>
  );
}
