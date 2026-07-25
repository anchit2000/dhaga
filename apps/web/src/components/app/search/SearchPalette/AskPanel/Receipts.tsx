import Link from "next/link";
import type { SearchReceipt } from "@/lib/ai/search";

/** The source contacts the answer reasoned over — the receipts, beneath it. */
export function Receipts({
  receipts,
  onNavigate,
}: {
  receipts: SearchReceipt[];
  onNavigate: () => void;
}) {
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
