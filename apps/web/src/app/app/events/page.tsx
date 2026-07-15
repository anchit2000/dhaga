import { requireUserIdForPage } from "@/lib/auth/guard";
import { listEventFilterOptions, listEventsPage } from "@/lib/repo/events";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { EventsTable } from "@/components/app/EventsTable";
import { EmptyState } from "@/components/app/EmptyState";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "Events — Dhaga" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserIdForPage();
  const params = await searchParams;
  const requestedPageSize = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requestedPageSize as (typeof TABLE_PAGE_SIZES)[number]) ? requestedPageSize : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { name: params.name ?? "", tags: params.tags ?? "" };
  const [{ rows: events, total }, options] = await Promise.all([
    listEventsPage({ page, pageSize, name: filters.name, tag: filters.tags }),
    listEventFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-fog">
          One event per event — the people you met there stay grouped.
        </p>
      </div>

      <CreateEventForm withStyle />

      {total === 0 && !filters.name && !filters.tags ? (
        <EmptyState
          title="No events yet"
          body="Create one above, or attach a event while quick-adding a person."
        />
      ) : (
        <EventsTable events={events} total={total} page={page} pageSize={pageSize} filters={filters} options={options} />
      )}
    </div>
  );
}
