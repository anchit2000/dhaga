"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function LoadButton({
  loading,
  onClick,
  children,
}: {
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-amber/35 px-3 text-xs text-ember transition-colors hover:bg-amber/10 disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Empty({ label }: { label: string }) {
  return <p className="text-xs text-fog">{label}</p>;
}

export function SectionError({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p className="text-xs text-red-400" role="alert">
      {error.message}
    </p>
  );
}

/** Later pages win: cursor pagination can re-serve a contact after ranking shifts. */
export function mergeById<T extends { contactId: string }>(pages: readonly T[][]): T[] {
  const found = new Map<string, T>();
  for (const items of pages) for (const item of items) found.set(item.contactId, item);
  return [...found.values()];
}

export async function fetchNetworkPage<TPage>(
  contactId: string,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<TPage> {
  const response = await fetch(
    `/api/contacts/${encodeURIComponent(contactId)}/network?${params}`,
    { signal },
  );
  const result = (await response.json()) as TPage & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Could not load network data.");
  return result;
}
