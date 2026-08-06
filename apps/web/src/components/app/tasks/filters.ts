import { inTaskScope, matchesActionOrNames } from "@/lib/filters/follow-up-scope";
import type { TaskItem } from "@/lib/repo/tasks";
import type { TaskFilter, TaskStatusFilter } from "@/utils/constants/tasks";

/**
 * The task board's filters. The scope and search rules are shared with the
 * calendar's filter bar (see lib/filters/follow-up-scope) so the two screens
 * cannot disagree about what "General" means or what a search matches; only the
 * status axis is local, because Tasks stores open/done and the calendar shows
 * both at once.
 */

export function inScope(item: TaskItem, filter: TaskFilter): boolean {
  return inTaskScope(item, filter);
}

/** The two status chips over the repo's stored status. */
export function inStatus(item: TaskItem, filter: TaskStatusFilter): boolean {
  return item.status === (filter === "active" ? "open" : "done");
}

export function matchesTaskSearch(item: TaskItem, query: string): boolean {
  return matchesActionOrNames(item, query);
}
