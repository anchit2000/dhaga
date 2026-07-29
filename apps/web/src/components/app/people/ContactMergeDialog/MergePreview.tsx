"use client";

import { Badge } from "@/components/ui/badge";
import type { ContactMergeRecord } from "@/lib/repo/contacts";
import { dedupeMethods, dedupeTags } from "./resolution";

function MethodRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog">
        {label}
      </span>
      <span className="min-w-0 break-words text-sm text-paper">{values.join(", ")}</span>
    </div>
  );
}

/**
 * Read-only union of every multi-value field across the records being merged —
 * so the user sees nothing is dropped. Methods dedupe case-insensitively by
 * value; tags dedupe as strings.
 */
export function MergePreview({ records }: { records: ContactMergeRecord[] }) {
  const emails = dedupeMethods(records, "emails").map((method) => method.value);
  const phones = dedupeMethods(records, "phones").map((method) => method.value);
  const links = dedupeMethods(records, "links").map((method) => method.value);
  const tags = dedupeTags(records);
  const empty = emails.length + phones.length + links.length + tags.length === 0;

  return (
    <div className="space-y-3 rounded-xl border border-seam bg-well/40 p-3">
      {empty ? (
        <p className="text-sm text-fog">No emails, phones, links, or tags to combine.</p>
      ) : (
        <div className="space-y-2">
          <MethodRow label="Emails" values={emails} />
          <MethodRow label="Phones" values={phones} />
          <MethodRow label="Links" values={links} />
          {tags.length > 0 ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog">
                Tags
              </span>
              <span className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </span>
            </div>
          ) : null}
        </div>
      )}
      <p className="text-xs text-fog">
        All emails, phones, links, tags, notes, facts &amp; relationships from every selected
        contact are kept.
      </p>
    </div>
  );
}
