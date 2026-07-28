import Link from "next/link";
import type { ReactElement } from "react";
import type { SearchReceipt } from "@/lib/ai/search";

/**
 * The source contacts the answer reasoned over — the receipts. On wide screens
 * this is the Ask tab's right rail; below `lg` it stacks beneath the answer.
 * While the answer is still streaming (no receipts yet) it shows a quiet
 * placeholder so the rail reads as "sources land here", not empty space.
 */
export function Receipts({
  receipts,
  pending = false,
  onNavigate,
}: {
  receipts: SearchReceipt[];
  pending?: boolean;
  onNavigate: () => void;
}): ReactElement | null {
  if (receipts.length === 0) {
    if (!pending) return null;
    return (
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-fog">Receipts</p>
        <p className="text-xs text-fog">Gathering the sources this answer draws on…</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-fog">Receipts</p>
      <ul className="space-y-1.5">
        {receipts.map((receipt) => (
          <li key={receipt.id}>
            <Link
              href={`/app/people/${receipt.id}`}
              onClick={onNavigate}
              className="block truncate rounded-lg border border-seam bg-panel px-3 py-2 text-sm text-paper transition-colors hover:bg-wash/[0.03]"
            >
              {receipt.label}
              {receipt.sublabel ? (
                <span className="text-fog">{` · ${receipt.sublabel}`}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
