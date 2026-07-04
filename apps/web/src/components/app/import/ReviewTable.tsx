"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportCandidate } from "@/lib/import";

/** Review rows before anything is written; capped render, full import. */
const MAX_RENDERED_ROWS = 500;

export function ReviewTable({
  candidates,
  selected,
  onToggle,
}: {
  candidates: ImportCandidate[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  const visible = candidates.slice(0, MAX_RENDERED_ROWS);
  return (
    <div className="overflow-x-auto rounded-2xl border border-seam bg-panel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((candidate, index) => (
            <TableRow
              key={index}
              className="cursor-pointer"
              onClick={() => onToggle(index)}
            >
              <TableCell>
                <input
                  type="checkbox"
                  className="size-4 accent-amber"
                  checked={selected.has(index)}
                  onChange={() => onToggle(index)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${candidate.contact.name}`}
                />
              </TableCell>
              <TableCell className="font-medium text-paper">
                {candidate.contact.name}
              </TableCell>
              <TableCell className="text-fog">{candidate.contact.title ?? "—"}</TableCell>
              <TableCell className="text-fog">{candidate.contact.company ?? "—"}</TableCell>
              <TableCell className="text-fog">
                {candidate.contact.emails[0] ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {candidates.length > MAX_RENDERED_ROWS ? (
        <p className="border-t border-seam px-4 py-2 text-xs text-fog">
          Showing the first {MAX_RENDERED_ROWS} rows — selection buttons above still
          apply to all {candidates.length}.
        </p>
      ) : null}
    </div>
  );
}
