"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import { EventBadge } from "@/components/app/EventBadge";
import { formatDate } from "@/utils/format-date";

interface EventRow {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  tags: string[];
  contactCount: number;
  startedAt: Date;
}

export function EventsTable({ events, total, page, pageSize, filters, options }: {
  events: EventRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
  options: { tags: string[] };
}) {
  const columns: DataTableColumn<EventRow>[] = [
    {
      id: "name",
      label: "Event",
      value: (row) => row.name,
      render: (row) => (
        <Link href={`/app/events/${row.id}`} className="flex items-center gap-2.5">
          <EventBadge name={row.name} emoji={row.emoji} color={row.color} size="sm" />
          <span className="font-medium text-paper transition-colors hover:text-ember">{row.name}</span>
        </Link>
      ),
    },
    {
      id: "tags",
      label: "Tags",
      value: (row) => row.tags.join(", "),
      options: options.tags,
      render: (row) => row.tags.join(", ") || "—",
      className: "max-w-64 truncate text-fog",
    },
    {
      id: "people",
      label: "People",
      value: (row) => String(row.contactCount),
      filter: false,
      className: "text-fog",
    },
    {
      id: "started",
      label: "Started",
      value: (row) => formatDate(row.startedAt),
      filter: false,
      className: "font-mono text-xs text-fog",
    },
  ];

  return (
    <DataTable
      key={`${page}:${pageSize}:${JSON.stringify(filters)}`}
      rows={events}
      columns={columns}
      rowKey={(event) => event.id}
      emptyMessage="No events match these filters."
      initialFilters={filters}
      server={{ total, page, pageSize }}
    />
  );
}
