"use client";

import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { PeopleTable } from "@/components/app/table/PeopleTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SAVED_TABS } from "@/utils/constants/saved";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { SavedTab } from "@/utils/constants/saved";

/**
 * Tab switcher for /app/saved. Each tab is a plain navigation link
 * (`?tab=starred|watching`) — switching triggers a fresh server render with
 * that collection's page, so there's no client-held pagination state to keep in
 * sync. The active tab renders the same server-mode PeopleTable used on
 * /app/people; the page fetches only the active collection, so the empty state
 * is per-tab. Underline / amber-active styling mirrors the settings tabs.
 */
export function SavedTabs({
  tab,
  people,
  total,
  page,
  pageSize,
  filters,
  options,
}: {
  tab: SavedTab;
  people: ContactListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
  options: { titles: string[]; companies: string[]; tags: string[] };
}) {
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <nav
        aria-label="Saved collections"
        className="flex w-full items-center gap-1 overflow-x-auto border-b border-seam [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {SAVED_TABS.map((item) => {
          const active = item.value === tab;
          const Icon = item.icon;
          return (
            <Link
              key={item.value}
              href={`/app/saved?tab=${item.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                active ? "border-amber text-paper" : "border-transparent text-fog hover:text-paper",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {total === 0 && !hasFilters ? (
        tab === "starred" ? (
          <EmptyState title="No starred contacts yet" body="Tap the star on anyone to save them here.">
            <Button render={<Link href="/app/people" />} variant="outline" size="sm">
              Browse people
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="You're not watching anyone yet" body="Turn on Watch on a contact to track job changes & news.">
            <Button render={<Link href="/app/people" />} variant="outline" size="sm">
              Browse people
            </Button>
          </EmptyState>
        )
      ) : (
        <PeopleTable people={people} total={total} page={page} pageSize={pageSize} filters={filters} options={options} />
      )}
    </div>
  );
}
