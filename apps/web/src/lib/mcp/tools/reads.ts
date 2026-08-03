import type { McpServer } from "@modelcontextprotocol/server";
import { getContact, listContactsPage } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { listAllOpenFollowUps, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { hybridSearch } from "@/lib/repo/search";
import { findWarmPaths } from "@/lib/repo/warm-paths";
import { withUserDb } from "@/lib/db/request-scope";
import { userIdFromAuth } from "../auth";
import { emptyResult, jsonResult } from "../result";
import {
  findWarmPathInput,
  getContactInput,
  listContactsInput,
  searchInput,
  upcomingDatesInput,
} from "../schemas";

/**
 * The read half of the MCP surface. Every handler resolves the user from the
 * verified token and runs its reads inside a single `withUserDb` scope — never
 * a fan-out, because the tenant pool caps at three.
 *
 * Deliberately no AI tool here: the connected client is already a model, so it
 * gets retrieval with receipts and reasons itself — no AI credits are spent.
 */
export function registerReadTools(server: McpServer): void {
  server.registerTool(
    "dhaga_search",
    {
      title: "Search your network",
      description:
        "Search the user's Dhaga contacts by name, company, role, location, or anything written in a note. Hybrid keyword + semantic search. Returns matching people with the snippets that matched, so you can cite why someone came back. Use this first when you don't already have a contact id.",
      inputSchema: searchInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const hits = await withUserDb(userId, () => hybridSearch(query));
      if (hits.length === 0) {
        return emptyResult(
          `No one in the user's network matches "${query}". Say so — do not guess at who they might have meant.`,
        );
      }
      return jsonResult(hits);
    },
  );

  server.registerTool(
    "dhaga_list_contacts",
    {
      title: "List contacts",
      description:
        "Browse the user's contacts with optional filters and pagination. Use this for 'who do I know at X' or 'show me my starred contacts'; use dhaga_search for open-ended questions.",
      inputSchema: listContactsInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, company, tag, starred, page, pageSize }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const { rows, total } = await withUserDb(userId, () =>
        listContactsPage({ page, pageSize, name, company, tag, starred }),
      );
      if (rows.length === 0) {
        return emptyResult("No contacts match those filters.");
      }
      return jsonResult({ contacts: rows, total, page, pageSize });
    },
  );

  server.registerTool(
    "dhaga_get_contact",
    {
      title: "Get a contact's full record",
      description:
        "Everything Dhaga knows about one person: their details and job history, the facts extracted from notes, recent notes verbatim, and any open follow-ups. Facts carry a sourceNoteId receipt — a fact with no receipt was entered by hand.",
      inputSchema: getContactInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ contactId }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      // One scope for all four reads — they share the single tenant connection.
      const record = await withUserDb(userId, async () => {
        const detail = await getContact(contactId);
        if (!detail) return null;
        const facts = await listFacts(contactId);
        const notes = await listNotes(contactId);
        const followUps = await listOpenFollowUps(contactId);
        return { ...detail, facts, notes: notes.slice(0, 25), followUps };
      });
      if (!record) {
        return emptyResult(
          `No contact with id "${contactId}". Look the person up with dhaga_search first.`,
        );
      }
      return jsonResult(record);
    },
  );

  server.registerTool(
    "dhaga_list_follow_ups",
    {
      title: "List open follow-ups",
      description:
        "Every open follow-up across the whole network, soonest-due first, with undated ones last. Use this for 'what am I on the hook for' or 'who am I overdue with' — including people who never got back to you.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    // No inputSchema, so the callback receives only the context.
    async (ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const followUps = await withUserDb(userId, () => listAllOpenFollowUps());
      if (followUps.length === 0) {
        return emptyResult("No open follow-ups. The user is all caught up.");
      }
      return jsonResult(followUps);
    },
  );

  server.registerTool(
    "dhaga_find_warm_path",
    {
      title: "Find a warm intro path",
      description:
        "Given a person or company the user wants to reach, returns up to three introduction paths through people they already know. Each path starts at the contact to ask and ends at the target. Returns nothing when no path exists — say so rather than inventing a connector.",
      inputSchema: findWarmPathInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ targetId }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const paths = await withUserDb(userId, () => findWarmPaths(targetId));
      if (paths.length === 0) {
        return emptyResult(
          "No warm path to that target in the user's graph. Tell them there is no known route rather than suggesting one.",
        );
      }
      return jsonResult(paths);
    },
  );

  server.registerTool(
    "dhaga_list_upcoming_dates",
    {
      title: "List upcoming important dates",
      description:
        "Birthdays, work anniversaries, and other dates recorded on contacts that fall inside the next N days, resolved in the user's own timezone. Use this for 'who should I reach out to this week'.",
      inputSchema: upcomingDatesInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ withinDays }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const dates = await withUserDb(userId, () => listUpcomingImportantDates(withinDays));
      if (dates.length === 0) {
        return emptyResult(`No important dates in the next ${withinDays} days.`);
      }
      return jsonResult(dates);
    },
  );
}
