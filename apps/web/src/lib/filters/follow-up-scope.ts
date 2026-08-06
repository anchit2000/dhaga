import type { TaskFilter } from "@/utils/constants/tasks";

/**
 * The scope and free-text predicates shared by every list of follow-ups/tasks —
 * today the /app/tasks board and the /app/calendar filter bar.
 *
 * They live here, structurally typed, rather than in either call site because
 * the two lists must answer "is this General?" and "does this match?" the SAME
 * way. A user who filters to General on Tasks and sees three items, then filters
 * to General on Calendar and sees four, has been told one of the two screens is
 * lying — and the drift would be invisible, since both readings are locally
 * plausible.
 *
 * Structural parameters (not `TaskItem`) because the two rows are genuinely
 * different types: `TaskItem.dueDate` is a `Date`, `CalendarFollowUp.dueDate` is
 * an ISO string, so neither is assignable to the other. Only the fields the
 * predicates actually read are required.
 */

export interface ScopeSubject {
  contactId: string | null;
  companyId: string | null;
}

export interface SearchSubject {
  action: string;
  contactName: string | null;
  companyName: string | null;
}

/**
 * The TASK_FILTERS scope vocabulary. "General" is the work that names nobody —
 * the user's own admin list — so it is the one value that must be exclusive:
 * anything attached to a person or a company is somebody else's business.
 */
export function inTaskScope(item: ScopeSubject, scope: TaskFilter): boolean {
  if (scope === "general") return !item.contactId && !item.companyId;
  if (scope === "people") return item.contactId !== null;
  if (scope === "companies") return item.companyId !== null;
  return true;
}

/**
 * Search covers WHO as well as WHAT: "Acme" has to find the item whose action
 * text never mentions Acme but whose company does, otherwise the box only works
 * for people who write the name into every task. An empty query matches
 * everything, so callers can pass raw input straight through.
 */
export function matchesActionOrNames(item: SearchSubject, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [item.action, item.contactName, item.companyName].some((field) =>
    field ? field.toLocaleLowerCase().includes(needle) : false,
  );
}
